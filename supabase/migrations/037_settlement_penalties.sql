-- 037_settlement_penalties.sql
-- 지체상금. 2026-09-04 담당자 요청.
--
--   「지체상금은 별도 산식이 있으나 우선 수기로 별도 입력 후 차후 정리하고자 합니다.
--    지체상금이 발생하면 미지급금에 합산하기 위함」
--
-- 그래서 산식을 넣지 않는다. 금액을 사람이 적고, 시스템은 그것을 청구액으로 받아
-- 중간정산·최종정산과 같은 방식으로 지급과 대사한다.
-- 산식이 확정되면 계산 컬럼을 덧붙이고 amount_krw 와 대조하면 된다 —
-- 지금 산식을 지어내면 그 값이 곧 사실처럼 굳는다.
--
-- 한 차수에 여러 건이 생길 수 있다 (선적 지연 + 인도 지연 등). unique 를 걸지 않는다.

CREATE TABLE IF NOT EXISTS settlement_penalties (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid          NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  incurred_on    date          NOT NULL,
  reason         text          NOT NULL,
  amount_krw     numeric(15,0) NOT NULL CHECK (amount_krw <> 0),
  /** 청구 기일. 비어 있으면 화면이 중간정산 기일 규칙을 따른다 */
  due_date       date,
  note           text,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  settlement_penalties IS
  '지체상금. 산식은 미확정이라 금액을 수기로 적는다. 부호 규약은 정산과 같다 — 양수 = 에이원이 토에이에 낼 돈.';
COMMENT ON COLUMN settlement_penalties.amount_krw IS
  '양수 = 에이원 지급, 음수 = 토에이 환급. 0 은 허용하지 않는다 — 0 이면 행이 없는 것과 같다.';
COMMENT ON COLUMN settlement_penalties.reason IS
  '무엇 때문에 물린 지체상금인가. 산식이 없는 동안 이 한 줄이 유일한 근거다.';

CREATE INDEX IF NOT EXISTS idx_settlement_penalties_tx
  ON settlement_penalties(transaction_id, incurred_on);

DROP TRIGGER IF EXISTS trg_settlement_penalties_updated_at ON settlement_penalties;
CREATE TRIGGER trg_settlement_penalties_updated_at
  BEFORE UPDATE ON settlement_penalties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 지급 배분에 지체상금 구분을 연다.
-- 034 의 kind CHECK 에 'penalty' 를 더한다 — 기존 값은 그대로 통과한다.
-- ─────────────────────────────────────────
ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS payment_allocations_kind_check;
ALTER TABLE payment_allocations
  ADD CONSTRAINT payment_allocations_kind_check
  CHECK (kind IN ('interim','closing','penalty','warehouse','other'));

ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS alloc_round_required;
ALTER TABLE payment_allocations
  ADD CONSTRAINT alloc_round_required CHECK (
    (kind IN ('interim','closing','penalty') AND transaction_id IS NOT NULL)
    OR kind IN ('warehouse','other')
  );

-- ─────────────────────────────────────────
-- 차수별 지급 상태 뷰에 지체상금을 태운다.
-- 034 의 정의를 그대로 두고 kind 목록에 'penalty' 만 더했다.
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_settlement_payment_status AS
WITH alloc AS (
  SELECT
    a.payment_id,
    a.transaction_id,
    a.kind,
    a.amount_krw,
    a.confirmed,
    p.paid_at,
    p.direction,
    -- 환급(in = 토에이→에이원)은 지급액에서 차감한다. 클로징 환급이 그렇게 정산된다.
    CASE WHEN p.direction = 'in' THEN -a.amount_krw ELSE a.amount_krw END AS signed_krw
  FROM payment_allocations a
  JOIN settlement_payments p ON p.id = a.payment_id
  WHERE a.transaction_id IS NOT NULL
)
SELECT
  t.id                                    AS transaction_id,
  t.round_no,
  k.kind,
  COALESCE(SUM(al.signed_krw), 0)         AS paid_krw,
  COUNT(al.transaction_id)                AS installment_count,
  MIN(al.paid_at)                         AS first_paid_at,
  MAX(al.paid_at)                         AS last_paid_at,
  COALESCE(BOOL_AND(al.confirmed), true)  AS all_confirmed,
  COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'payment_id', al.payment_id,
        'paid_at',   al.paid_at,
        'amount',    al.signed_krw,
        'direction', al.direction,
        'confirmed', al.confirmed
      ) ORDER BY al.paid_at, al.amount_krw
    ) FILTER (WHERE al.transaction_id IS NOT NULL),
    '[]'::jsonb
  )                                       AS installments
FROM transactions t
CROSS JOIN (VALUES ('interim'::text), ('closing'::text), ('penalty'::text)) AS k(kind)
LEFT JOIN alloc al ON al.transaction_id = t.id AND al.kind = k.kind
GROUP BY t.id, t.round_no, k.kind;

COMMENT ON VIEW v_settlement_payment_status IS
  '차수×구분(중간·최종·지체상금)별 지급 합계와 회차 목록. 청구금액·잔액·연체일은 애플리케이션에서 합친다.';

-- ─────────────────────────────────────────
-- RLS — 034 와 같은 방식. AUTH_DISABLED 구간.
-- ─────────────────────────────────────────
ALTER TABLE settlement_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temp open access until auth restored" ON settlement_penalties;
CREATE POLICY "temp open access until auth restored"
  ON settlement_penalties FOR ALL
  USING (true) WITH CHECK (true);

/* AUTH_RESTORE
DROP POLICY "temp open access until auth restored" ON settlement_penalties;

CREATE POLICY "both sides can read penalties"
  ON settlement_penalties FOR SELECT
  USING (auth_role() IN ('a1_admin','a1_user','toei_user'));
CREATE POLICY "a1 can write penalties"
  ON settlement_penalties FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user'))
  WITH CHECK (auth_role() IN ('a1_admin','a1_user'));
*/
