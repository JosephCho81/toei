-- 027_lc_fee_custom_rate.sql
-- 담당자 요청: LC 수수료(이자) 항목에 은행 자체 매도환율을 따로 적용할 수 있게 한다.
--   고시환율(클로징환율)로 결제되지 않고 은행 매도환율로 결제 후 청구되는 건이 존재한다.
--   exchange_rate 가 NULL 이면 지금까지처럼 클로징환율(bok_exchange_rate)로 환산한다.
--   기존 확정 정산은 전부 NULL 이므로 계산 결과가 바뀌지 않는다.

ALTER TABLE lc_fee_items
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,4);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lc_fee_items_exchange_rate_check'
  ) THEN
    ALTER TABLE lc_fee_items
      ADD CONSTRAINT lc_fee_items_exchange_rate_check
      CHECK (exchange_rate IS NULL OR exchange_rate > 0);
  END IF;
END $$;

COMMENT ON COLUMN lc_fee_items.exchange_rate IS
  '이 항목에만 적용할 별도 환율(은행 매도환율 등). NULL 이면 클로징환율 사용. currency=USD 일 때만 의미 있다.';

-- ─────────────────────────────────────────
-- save_closing_items — exchange_rate 반영
-- (026 과 동일하게 SECURITY DEFINER + 잠금 검사 직접 수행)
-- ─────────────────────────────────────────
DROP FUNCTION IF EXISTS save_closing_items(uuid, jsonb, jsonb);

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

  INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, currency, amount_usd, exchange_rate, sort_order)
  SELECT
    p_closing_settlement_id,
    COALESCE(f->>'item_name', ''),
    COALESCE((f->>'amount_krw')::numeric, 0),
    CASE WHEN f->>'currency' = 'USD' THEN 'USD' ELSE 'KRW' END,
    NULLIF(f->>'amount_usd', '')::numeric,
    CASE WHEN f->>'currency' = 'USD' THEN NULLIF(f->>'exchange_rate', '')::numeric ELSE NULL END,
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
