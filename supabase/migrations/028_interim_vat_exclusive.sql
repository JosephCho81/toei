-- 028_interim_vat_exclusive.sql
-- 담당자 요청: 중간정산을 '부가세 미포함 공급가' 기준으로 바꾼다.
--
--   (변경 전) 확정금액 = 수입원가 + 해상운임 + 통관비(수입부가세 포함)
--   (변경 후) 공급가   = 수입원가 + 해상운임 + 통관비(수입부가세 제외)   ← 절사는 여기에 적용
--             부가세   = 공급가 × 10%
--             합계     = 공급가 + 부가세
--
-- 근거: 토에이는 통관 시 낸 수입부가세를 매입세액공제로 회수하고,
--       에이원에는 마진 포함 공급가에 대한 매출부가세를 세금계산서로 청구한다.
--       따라서 수입부가세는 청구 대상이 아니다.
--
-- 이미 확정된 정산의 금액이 조용히 바뀌면 안 되므로,
-- 기존 행은 전부 vat_mode='inclusive'(구방식)로 고정하고 신규만 'exclusive'를 쓴다.
-- 재계산 대상 차수의 전환은 이 마이그레이션이 아니라 별도 승인 후 수행한다.

-- ─────────────────────────────────────────
-- 1. 수입부가세 항목 식별 플래그
--    지금까지는 항목명이 '부가세' 인지로만 구분할 수 있었는데,
--    37차처럼 '부가세 (429)' 로 LC 구분이 붙는 경우가 있어 이름 매칭은 신뢰할 수 없다.
--    금액이 직접 걸린 계산이므로 플래그로 고정한다.
-- ─────────────────────────────────────────
ALTER TABLE interim_cost_items
  ADD COLUMN IF NOT EXISTS is_import_vat boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN interim_cost_items.is_import_vat IS
  '통관 시 세관에 납부한 수입부가세 항목. true 면 공급가 계산에서 제외한다(매입세액공제 대상).';

-- 기존 데이터 백필: 통관 그룹에서 이름이 ''부가세''로 시작하는 항목
UPDATE interim_cost_items
   SET is_import_vat = true
 WHERE group_type <> 'shipping'
   AND btrim(item_name) LIKE '부가세%'
   AND is_import_vat = false;

-- ─────────────────────────────────────────
-- 2. 정산 방식 스냅샷 + 공급가/부가세 보관
--    DEFAULT 'inclusive' 로 컬럼을 추가해 기존 행을 전부 구방식으로 굳힌 뒤,
--    기본값만 'exclusive' 로 바꾼다 (UPDATE 없이 안전하게 분리).
-- ─────────────────────────────────────────
ALTER TABLE interim_settlements
  ADD COLUMN IF NOT EXISTS vat_mode text NOT NULL DEFAULT 'inclusive';

ALTER TABLE interim_settlements
  ALTER COLUMN vat_mode SET DEFAULT 'exclusive';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'interim_settlements_vat_mode_check'
  ) THEN
    ALTER TABLE interim_settlements
      ADD CONSTRAINT interim_settlements_vat_mode_check
      CHECK (vat_mode IN ('inclusive','exclusive'));
  END IF;
END $$;

COMMENT ON COLUMN interim_settlements.vat_mode IS
  'inclusive = 구방식(수입부가세를 비용으로 합산한 부가세 포함가). exclusive = 신방식(공급가 + 부가세 10%).';

ALTER TABLE interim_settlements
  ADD COLUMN IF NOT EXISTS supply_amount_krw numeric(15,0),
  ADD COLUMN IF NOT EXISTS vat_amount_krw    numeric(15,0);

COMMENT ON COLUMN interim_settlements.supply_amount_krw IS
  '공급가(절사 후). exclusive 모드에서 confirmed_amount_krw = supply_amount_krw + vat_amount_krw.';
COMMENT ON COLUMN interim_settlements.vat_amount_krw IS
  '매출부가세 = supply_amount_krw × 10%. inclusive 모드 정산은 NULL.';

-- 절사 기본값: 17차부터 100원 단위 절사로 합의 (026 에서 클로징만 none 으로 바꿨었다)
ALTER TABLE interim_settlements ALTER COLUMN rounding_policy SET DEFAULT 'floor_100';

-- ─────────────────────────────────────────
-- 3. save_interim_cost_items — is_import_vat 반영
--    그동안 DB 에만 있던 함수를 마이그레이션으로 정식화한다(save_closing_items 와 동일 구조).
--    앱이 anon 키로 동작하므로 SECURITY DEFINER 로 두되 잠금 검사를 함수가 직접 한다.
-- ─────────────────────────────────────────
DROP FUNCTION IF EXISTS save_interim_cost_items(uuid, jsonb);
DROP FUNCTION IF EXISTS save_interim_cost_items(uuid, json);

CREATE FUNCTION save_interim_cost_items(
  p_interim_settlement_id uuid,
  p_items jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked boolean;
BEGIN
  SELECT is_locked INTO v_locked
  FROM interim_settlements WHERE id = p_interim_settlement_id;

  IF v_locked IS NULL THEN
    RAISE EXCEPTION '중간정산을 찾을 수 없습니다: %', p_interim_settlement_id;
  END IF;
  IF v_locked THEN
    RAISE EXCEPTION '확정·잠금된 중간정산은 수정할 수 없습니다.';
  END IF;

  DELETE FROM interim_cost_items WHERE interim_settlement_id = p_interim_settlement_id;

  INSERT INTO interim_cost_items (
    interim_settlement_id, item_name, group_type, amount_krw,
    is_vat_taxable, vat_amount_krw, is_import_vat, sort_order
  )
  SELECT
    p_interim_settlement_id,
    COALESCE(i->>'item_name', ''),
    CASE WHEN i->>'group_type' = 'shipping' THEN 'shipping' ELSE 'customs' END,
    COALESCE((i->>'amount_krw')::numeric, 0),
    COALESCE((i->>'is_vat_taxable')::boolean, false),
    COALESCE((i->>'vat_amount_krw')::numeric, 0),
    COALESCE((i->>'is_import_vat')::boolean, false),
    COALESCE((i->>'sort_order')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS i;
END $$;

GRANT EXECUTE ON FUNCTION save_interim_cost_items(uuid, jsonb) TO anon, authenticated, service_role;
