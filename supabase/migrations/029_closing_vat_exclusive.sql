-- 029_closing_vat_exclusive.sql
-- 담당자 확정 사항 반영 (클로징정산).
--
--   공급가 = (환차손익 + LC부대비용) × 분담비율 + 클로징 추가비용
--   부가세 = 공급가 × 10%
--   합계   = 공급가 + 부가세
--
-- 1) 분담비율: 초기엔 각 사 50% 였으나 이후 한국에이원 전액 부담으로 바뀌었다.
--    기존 33건은 저장된 50% 를 그대로 두고 기본값만 100 으로 올린다.
-- 2) 지금까지는 '에이원부담분 × 1.1' 로 부가세를 뭉쳐 넣고
--    클로징 추가비용(A+B+C)은 부가세 밖에 더했다. 신방식은 둘 다 공급가에 넣고 10% 를 건다.
-- 3) 확정된 정산의 금액이 바뀌면 안 되므로 기존 행은 vat_mode='inclusive' 로 굳힌다.

-- ─────────────────────────────────────────
-- 1. 정산 방식 스냅샷 + 공급가/부가세 보관
--    DEFAULT 'inclusive' 로 추가해 기존 행을 구방식으로 굳힌 뒤 기본값만 바꾼다.
-- ─────────────────────────────────────────
ALTER TABLE closing_settlements
  ADD COLUMN IF NOT EXISTS vat_mode text NOT NULL DEFAULT 'inclusive';

ALTER TABLE closing_settlements
  ALTER COLUMN vat_mode SET DEFAULT 'exclusive';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'closing_settlements_vat_mode_check'
  ) THEN
    ALTER TABLE closing_settlements
      ADD CONSTRAINT closing_settlements_vat_mode_check
      CHECK (vat_mode IN ('inclusive','exclusive'));
  END IF;
END $$;

COMMENT ON COLUMN closing_settlements.vat_mode IS
  'inclusive = 구방식(에이원부담분 × 1.1 + 클로징추가비용). exclusive = 신방식(공급가 + 부가세 10%).';

ALTER TABLE closing_settlements
  ADD COLUMN IF NOT EXISTS supply_amount_krw numeric(15,0),
  ADD COLUMN IF NOT EXISTS vat_amount_krw    numeric(15,0);

COMMENT ON COLUMN closing_settlements.supply_amount_krw IS
  '공급가(절사 후). exclusive 모드에서 confirmed_amount_krw = supply_amount_krw + vat_amount_krw.';
COMMENT ON COLUMN closing_settlements.vat_amount_krw IS
  '매출부가세 = supply_amount_krw × 10%. inclusive 모드 정산은 NULL.';

-- ─────────────────────────────────────────
-- 2. 기본값 조정 — 기존 행의 값은 건드리지 않는다
-- ─────────────────────────────────────────
-- 환차손익·부대비용을 한국에이원이 전액 부담한다 (담당자 확인)
ALTER TABLE closing_settlements ALTER COLUMN fx_burden_a1_pct SET DEFAULT 100.00;

-- 17차부터 100원 단위 절사 합의 (026 에서 none 으로 내렸던 것을 되돌린다)
ALTER TABLE closing_settlements ALTER COLUMN rounding_policy SET DEFAULT 'floor_100';
