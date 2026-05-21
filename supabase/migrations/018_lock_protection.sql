-- 018_lock_protection.sql
-- 잠금된 정산의 비용 항목 쓰기 방지
-- 기존 permissive 정책과 AND 조건으로 동작하도록 RESTRICTIVE 정책 사용

-- ─────────────────────────────────────────
-- helper 함수
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION interim_settlement_is_unlocked(settlement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NOT is_locked FROM interim_settlements WHERE id = settlement_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION closing_settlement_is_unlocked(settlement_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT NOT is_locked FROM closing_settlements WHERE id = settlement_id LIMIT 1;
$$;

-- ─────────────────────────────────────────
-- interim_cost_items: 잠금 시 쓰기 차단
-- ─────────────────────────────────────────
CREATE POLICY "interim_cost_items lock check insert"
  ON interim_cost_items AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (interim_settlement_is_unlocked(interim_settlement_id));

CREATE POLICY "interim_cost_items lock check update"
  ON interim_cost_items AS RESTRICTIVE
  FOR UPDATE
  USING (interim_settlement_is_unlocked(interim_settlement_id))
  WITH CHECK (interim_settlement_is_unlocked(interim_settlement_id));

CREATE POLICY "interim_cost_items lock check delete"
  ON interim_cost_items AS RESTRICTIVE
  FOR DELETE
  USING (interim_settlement_is_unlocked(interim_settlement_id));

-- ─────────────────────────────────────────
-- closing_cost_items: 잠금 시 쓰기 차단
-- ─────────────────────────────────────────
CREATE POLICY "closing_cost_items lock check insert"
  ON closing_cost_items AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (closing_settlement_is_unlocked(closing_settlement_id));

CREATE POLICY "closing_cost_items lock check update"
  ON closing_cost_items AS RESTRICTIVE
  FOR UPDATE
  USING (closing_settlement_is_unlocked(closing_settlement_id))
  WITH CHECK (closing_settlement_is_unlocked(closing_settlement_id));

CREATE POLICY "closing_cost_items lock check delete"
  ON closing_cost_items AS RESTRICTIVE
  FOR DELETE
  USING (closing_settlement_is_unlocked(closing_settlement_id));

-- ─────────────────────────────────────────
-- lc_fee_items: 잠금 시 쓰기 차단
-- ─────────────────────────────────────────
CREATE POLICY "lc_fee_items lock check insert"
  ON lc_fee_items AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (closing_settlement_is_unlocked(closing_settlement_id));

CREATE POLICY "lc_fee_items lock check update"
  ON lc_fee_items AS RESTRICTIVE
  FOR UPDATE
  USING (closing_settlement_is_unlocked(closing_settlement_id))
  WITH CHECK (closing_settlement_is_unlocked(closing_settlement_id));

CREATE POLICY "lc_fee_items lock check delete"
  ON lc_fee_items AS RESTRICTIVE
  FOR DELETE
  USING (closing_settlement_is_unlocked(closing_settlement_id));
