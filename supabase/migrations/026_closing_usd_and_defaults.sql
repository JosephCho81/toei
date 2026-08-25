-- 026_closing_usd_and_defaults.sql
-- 담당자 요청 반영:
--  1) LC 결제비용을 달러 기준으로 입력하고 원화는 클로징환율로 자동 환산해 보관한다.
--  2) LC 수수료 항목(이자 등)을 달러로도 기재할 수 있게 한다.
--  3) 절사 정책 기본값을 '절사 없음'으로 바꾼다.
--  4) save_closing_items 를 마이그레이션으로 정식화한다(그동안 DB에만 존재).

-- ─────────────────────────────────────────
-- 1. LC 결제비용 (USD)
--    원화(lc_payment_total_krw)는 계산·리포트가 계속 쓰므로 그대로 두고,
--    USD 를 입력값으로 추가한다. 기존 확정건은 USD 가 NULL 이고 원화 값이 기준으로 남는다.
-- ─────────────────────────────────────────
ALTER TABLE closing_settlements
  ADD COLUMN IF NOT EXISTS lc_payment_total_usd numeric(15,2);

COMMENT ON COLUMN closing_settlements.lc_payment_total_usd IS
  'LC 결제비용 입력값(USD). 원화 = round(USD × bok_exchange_rate) 로 lc_payment_total_krw 에 저장.';

-- ─────────────────────────────────────────
-- 2. LC 수수료 항목 통화
-- ─────────────────────────────────────────
ALTER TABLE lc_fee_items
  ADD COLUMN IF NOT EXISTS currency   text NOT NULL DEFAULT 'KRW',
  ADD COLUMN IF NOT EXISTS amount_usd numeric(15,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lc_fee_items_currency_check'
  ) THEN
    ALTER TABLE lc_fee_items
      ADD CONSTRAINT lc_fee_items_currency_check CHECK (currency IN ('KRW','USD'));
  END IF;
END $$;

COMMENT ON COLUMN lc_fee_items.currency IS
  'KRW = amount_krw 직접 입력. USD = amount_usd 입력, amount_krw 는 클로징환율 환산값(반올림).';

-- ─────────────────────────────────────────
-- 3. 절사 정책 기본값: 절사 없음
--    기존 행의 값은 건드리지 않는다(확정된 정산의 계산 근거가 바뀌면 안 됨).
-- ─────────────────────────────────────────
ALTER TABLE closing_settlements ALTER COLUMN rounding_policy SET DEFAULT 'none';

-- ─────────────────────────────────────────
-- 4. save_closing_items — 통화 컬럼 반영
--    lc_fee_items RLS 는 auth_role() in ('a1_admin','a1_user') 를 요구하는데
--    현재 앱은 인증 비활성(AUTH_DISABLED) 상태로 anon 키를 쓴다.
--    그래서 SECURITY DEFINER 로 두되, RLS 를 우회하는 만큼 잠금 검사를 함수가 직접 한다.
-- ─────────────────────────────────────────
DROP FUNCTION IF EXISTS save_closing_items(uuid, jsonb, jsonb);
DROP FUNCTION IF EXISTS save_closing_items(uuid, json, json);

CREATE FUNCTION save_closing_items(
  p_closing_settlement_id uuid,
  p_lc_fees jsonb,
  p_costs   jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked boolean;
BEGIN
  SELECT is_locked INTO v_locked
  FROM closing_settlements WHERE id = p_closing_settlement_id;

  IF v_locked IS NULL THEN
    RAISE EXCEPTION '클로징정산을 찾을 수 없습니다: %', p_closing_settlement_id;
  END IF;
  IF v_locked THEN
    RAISE EXCEPTION '확정·잠금된 클로징정산은 수정할 수 없습니다.';
  END IF;

  DELETE FROM lc_fee_items WHERE closing_settlement_id = p_closing_settlement_id;
  DELETE FROM closing_cost_items WHERE closing_settlement_id = p_closing_settlement_id;

  INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, currency, amount_usd, sort_order)
  SELECT
    p_closing_settlement_id,
    COALESCE(f->>'item_name', ''),
    COALESCE((f->>'amount_krw')::numeric, 0),
    CASE WHEN f->>'currency' = 'USD' THEN 'USD' ELSE 'KRW' END,
    NULLIF(f->>'amount_usd', '')::numeric,
    COALESCE((f->>'sort_order')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_lc_fees, '[]'::jsonb)) AS f;

  INSERT INTO closing_cost_items (closing_settlement_id, item_name, amount_krw, includes_vat, sort_order)
  SELECT
    p_closing_settlement_id,
    COALESCE(c->>'item_name', ''),
    COALESCE((c->>'amount_krw')::numeric, 0),
    COALESCE((c->>'includes_vat')::boolean, false),
    COALESCE((c->>'sort_order')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_costs, '[]'::jsonb)) AS c;
END $$;

GRANT EXECUTE ON FUNCTION save_closing_items(uuid, jsonb, jsonb) TO anon, authenticated, service_role;
