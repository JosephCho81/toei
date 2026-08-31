-- 031_advance_payment_rate.sql
-- 담당자 요청: LC 결제비용 일부를 다른 환율로 선지급한 건을 표현할 수 있게 한다.
--   1차 선지급금 7,040$ 가 클로징환율(1202.4)이 아닌 1156.4 로 결제됐다.
--   7,040 × 1156.4 + 53,760 × 1202.4 = 72,782,080 → DB 저장값과 정확히 일치.
--   지금 구조는 총액 × 단일 환율이라 이 차이를 표현하지 못한다.
--   선지급금이 NULL·0 이면 지금까지처럼 총액을 클로징환율로 환산한다(기존 정산 계산 불변).

ALTER TABLE closing_settlements
  ADD COLUMN IF NOT EXISTS advance_payment_usd   numeric(15,2),
  ADD COLUMN IF NOT EXISTS advance_exchange_rate numeric(10,4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'closing_settlements_advance_usd_check'
  ) THEN
    ALTER TABLE closing_settlements
      ADD CONSTRAINT closing_settlements_advance_usd_check
      CHECK (advance_payment_usd IS NULL OR advance_payment_usd >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'closing_settlements_advance_rate_check'
  ) THEN
    ALTER TABLE closing_settlements
      ADD CONSTRAINT closing_settlements_advance_rate_check
      CHECK (advance_exchange_rate IS NULL OR advance_exchange_rate > 0);
  END IF;

  -- 선지급금을 넣어놓고 환율을 비우면 그 구간이 0원으로 굳는다. DB 차원에서 막는다.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'closing_settlements_advance_pair_check'
  ) THEN
    ALTER TABLE closing_settlements
      ADD CONSTRAINT closing_settlements_advance_pair_check
      CHECK (COALESCE(advance_payment_usd, 0) = 0 OR advance_exchange_rate IS NOT NULL);
  END IF;

  -- 선지급금이 총액을 넘으면 잔액이 음수가 되어 결제비용이 뒤집힌다.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'closing_settlements_advance_total_check'
  ) THEN
    ALTER TABLE closing_settlements
      ADD CONSTRAINT closing_settlements_advance_total_check
      CHECK (COALESCE(advance_payment_usd, 0) = 0
             OR advance_payment_usd <= COALESCE(lc_payment_total_usd, 0));
  END IF;
END $$;

COMMENT ON COLUMN closing_settlements.advance_payment_usd IS
  'LC 결제비용 총액(lc_payment_total_usd) 중 별도 환율로 선지급한 금액(USD). NULL·0 이면 선지급 없음.';
COMMENT ON COLUMN closing_settlements.advance_exchange_rate IS
  '선지급분에만 적용할 환율. 잔액은 클로징환율(bok_exchange_rate)로 환산한다.';
