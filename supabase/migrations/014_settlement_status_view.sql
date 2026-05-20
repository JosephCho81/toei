-- 014_settlement_status_view.sql
-- transactions.settlement_status 물리 컬럼을 뷰(v_transaction_status)에서
-- 실시간 계산하는 방식으로 전환.
-- Phase 1 트리거(settlement_status 동기화)는 불필요해지므로 제거하고
-- is_locked 동기화(RLS 용도)만 남긴다.

-- ─────────────────────────────────────────
-- 1. Phase 1 트리거 및 함수 제거
-- ─────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_sync_status_from_interim ON interim_settlements;
DROP TRIGGER IF EXISTS trg_sync_status_from_closing ON closing_settlements;
DROP FUNCTION IF EXISTS sync_transaction_status();

-- ─────────────────────────────────────────
-- 2. is_locked 전용 트리거 (RLS 용도)
-- closing_settlements.is_locked 변경 시에만 transactions.is_locked 동기화.
-- interim 잠금은 transactions.is_locked에 영향 없음.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_tx_is_locked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE transactions
  SET is_locked = (NEW.is_locked = true)
  WHERE id = NEW.transaction_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_is_locked_from_closing
  AFTER INSERT OR UPDATE OF is_locked ON closing_settlements
  FOR EACH ROW EXECUTE FUNCTION sync_tx_is_locked();

-- ─────────────────────────────────────────
-- 3. v_transaction_status 뷰 생성
-- settlement_status는 closing/interim 잠금 상태에서 실시간 계산.
-- closing > interim 우선순위.
-- interim/closing 요약 컬럼도 함께 제공 (toei_transaction_view에서 재사용).
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_transaction_status AS
SELECT
  -- transactions 컬럼 (settlement_status 제외, 뷰에서 계산으로 대체)
  t.id,
  t.round_no,
  t.round_label,
  t.order_no,
  t.manufacturer_id,
  t.import_amount_usd,
  t.lc_no,
  t.lc_open_date,
  t.customs_date,
  t.customs_exchange_rate,
  t.margin_rate_pct,
  t.is_locked,
  t.notes,
  t.created_at,
  t.updated_at,
  t.a1_payment_date,
  t.lc_expiry_date,
  t.import_amount_usd_actual,
  t.import_amount_usd_theoretical,
  t.customs_declaration_no,
  t.customs_amount_usd,
  t.customs_taxable_krw,
  t.lc_status,
  t.logistics_status,
  t.document_status,
  t.delivery_dates,
  -- settlement_status 실시간 계산 (물리 컬럼 대체)
  CASE
    WHEN cs.is_locked = true  THEN 'closing_done'
    WHEN cs.id IS NOT NULL    THEN 'closing_saved'
    WHEN ins.is_locked = true THEN 'interim_done'
    WHEN ins.id IS NOT NULL   THEN 'interim_saved'
    ELSE                           'pending'
  END::text AS settlement_status,
  -- interim 요약 (toei_transaction_view 등에서 재사용)
  ins.confirmed_amount_krw  AS interim_confirmed_krw,
  ins.is_locked             AS interim_is_locked,
  ins.is_paid               AS interim_is_paid,
  -- closing 요약
  cs.confirmed_amount_krw   AS closing_confirmed_krw,
  cs.is_locked              AS closing_is_locked,
  cs.is_paid                AS closing_is_paid
FROM transactions t
LEFT JOIN interim_settlements ins ON ins.transaction_id = t.id
LEFT JOIN closing_settlements  cs  ON cs.transaction_id  = t.id;

-- ─────────────────────────────────────────
-- 4. toei_transaction_view 갱신
-- transactions 직접 조회 대신 v_transaction_status 사용
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW toei_transaction_view
WITH (security_invoker = true) AS
SELECT
  v.id,
  v.round_label,
  v.order_no,
  m.name AS manufacturer_name,
  v.lc_no,
  v.lc_open_date,
  v.settlement_status,
  v.is_locked,
  CASE WHEN v.settlement_status IN ('interim_done', 'closing_done', 'closing_saved')
    THEN v.interim_confirmed_krw
    ELSE null
  END AS interim_confirmed_krw,
  CASE WHEN v.settlement_status = 'closing_done'
    THEN v.closing_confirmed_krw
    ELSE null
  END AS closing_confirmed_krw,
  v.interim_is_paid,
  v.closing_is_paid
FROM v_transaction_status v
LEFT JOIN manufacturers m ON m.id = v.manufacturer_id;

-- ─────────────────────────────────────────
-- 5. 물리 컬럼 삭제
-- 뷰에서 명시적 컬럼 목록을 사용하므로 뷰는 영향 없음.
-- ─────────────────────────────────────────
ALTER TABLE transactions DROP COLUMN settlement_status;
