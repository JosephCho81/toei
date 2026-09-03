-- 034_settlement_payments.sql
-- 분할지급·묶음지급 원장.
--
-- 왜 테이블을 나누는가:
--   통장 한 줄이 여러 차수에 걸치고(묶음 지급), 한 차수가 통장 여러 줄에 걸친다(분할 지급).
--   지금까지 interim_settlements.paid_date 한 칸에 담으려다 마지막 1회만 남았다.
--   settlement_payments = 사실(통장), payment_allocations = 판단(몇 차 것인가)로 가른다.
--
-- 잔액·연체일은 저장하지 않는다. v_settlement_payment_status 로 계산한다.

-- ─────────────────────────────────────────
-- 1. 청구 기일
--    lib/calculations/schedule.ts 의 공식은 2025-06-01 이후 개설분만 확정 적용된다.
--    그 이전 차수는 원본 엑셀의 「입금일」이 유일한 근거라 컬럼으로 들고 있어야 한다.
-- ─────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_due_date date;

COMMENT ON COLUMN transactions.payment_due_date IS
  '중간정산 청구 기일. 비어 있으면 computeSettlementSchedule() 계산값을 쓴다.';

-- ─────────────────────────────────────────
-- 2. 통장 원장 — 실제로 움직인 돈
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_payments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_at     date        NOT NULL,
  direction   text        NOT NULL DEFAULT 'out'
                          CHECK (direction IN ('out','in')),
  amount_krw  numeric(15,0) NOT NULL CHECK (amount_krw > 0),
  bank_memo   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  settlement_payments IS '통장 입출금 한 줄 = 한 행. 차수는 여기 적지 않는다.';
COMMENT ON COLUMN settlement_payments.direction IS 'out = 토에이→에이원 지급, in = 환급·상계 입금';
COMMENT ON COLUMN settlement_payments.bank_memo IS '통장 적요 원문. 묶음 지급의 배분 근거가 여기 적혀 있다.';

CREATE INDEX IF NOT EXISTS idx_settlement_payments_paid_at
  ON settlement_payments(paid_at DESC);

-- ─────────────────────────────────────────
-- 3. 배분 — 이 돈이 어느 차수 것인가
--    kind = interim/closing 이면 차수가 반드시 있어야 하고,
--    warehouse/other 는 차수 없이 「정산 무관」으로 분류만 한다.
--    배분이 아예 없거나 합계가 모자라면 그 차액이 「미배분」이다.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_allocations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     uuid        NOT NULL REFERENCES settlement_payments(id) ON DELETE CASCADE,
  transaction_id uuid        REFERENCES transactions(id) ON DELETE RESTRICT,
  kind           text        NOT NULL
                             CHECK (kind IN ('interim','closing','warehouse','other')),
  amount_krw     numeric(15,0) NOT NULL CHECK (amount_krw > 0),
  confirmed      boolean     NOT NULL DEFAULT true,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alloc_round_required CHECK (
    (kind IN ('interim','closing') AND transaction_id IS NOT NULL)
    OR kind IN ('warehouse','other')
  )
);

COMMENT ON COLUMN payment_allocations.confirmed IS
  'false = 사람 손을 안 거친 초기 배분. 화면에서 「확인 대기」로 뜬다.';

CREATE INDEX IF NOT EXISTS idx_payment_allocations_tx
  ON payment_allocations(transaction_id, kind);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment
  ON payment_allocations(payment_id);

-- ─────────────────────────────────────────
-- 4. 배분 합계가 이체 금액을 넘지 못하게 막는다.
--    모자라는 것은 허용한다 — 모르면 미배분으로 두는 게 억지 배분보다 낫다.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_allocation_total() RETURNS trigger AS $$
DECLARE
  pid       uuid;
  total     numeric(15,0);
  pay_total numeric(15,0);
BEGIN
  pid := COALESCE(NEW.payment_id, OLD.payment_id);

  SELECT COALESCE(SUM(amount_krw), 0) INTO total
    FROM payment_allocations WHERE payment_id = pid;

  SELECT amount_krw INTO pay_total
    FROM settlement_payments WHERE id = pid;

  IF pay_total IS NOT NULL AND total > pay_total THEN
    RAISE EXCEPTION '배분 합계(%)가 이체 금액(%)을 넘습니다', total, pay_total
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocation_total ON payment_allocations;
CREATE CONSTRAINT TRIGGER trg_allocation_total
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_allocation_total();

-- 이체 금액을 줄일 때도 같은 검사를 해야 한다.
CREATE OR REPLACE FUNCTION check_payment_amount() RETURNS trigger AS $$
DECLARE
  total numeric(15,0);
BEGIN
  SELECT COALESCE(SUM(amount_krw), 0) INTO total
    FROM payment_allocations WHERE payment_id = NEW.id;

  IF total > NEW.amount_krw THEN
    RAISE EXCEPTION '이미 배분된 금액(%)보다 작게 바꿀 수 없습니다', total
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_amount ON settlement_payments;
CREATE TRIGGER trg_payment_amount
  BEFORE UPDATE OF amount_krw ON settlement_payments
  FOR EACH ROW EXECUTE FUNCTION check_payment_amount();

DROP TRIGGER IF EXISTS trg_settlement_payments_updated_at ON settlement_payments;
CREATE TRIGGER trg_settlement_payments_updated_at
  BEFORE UPDATE ON settlement_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_payment_allocations_updated_at ON payment_allocations;
CREATE TRIGGER trg_payment_allocations_updated_at
  BEFORE UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 5. 차수별 지급 상태 — 화면이 읽는 유일한 창구
--    installments 에 회차별 날짜·금액이 순서대로 들어 있다. 화면은 이걸 그대로 펼친다.
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
    -- 환급(in)은 지급액에서 차감한다. 클로징 환급이 그렇게 정산된다.
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
CROSS JOIN (VALUES ('interim'::text), ('closing'::text)) AS k(kind)
LEFT JOIN alloc al ON al.transaction_id = t.id AND al.kind = k.kind
GROUP BY t.id, t.round_no, k.kind;

COMMENT ON VIEW v_settlement_payment_status IS
  '차수×구분별 지급 합계와 회차 목록. 청구금액·잔액·연체일은 애플리케이션에서 합친다.';

-- 미배분 잔액 — 통장 원장 화면과 알림이 읽는다.
CREATE OR REPLACE VIEW v_payment_unallocated AS
SELECT
  p.id,
  p.paid_at,
  p.direction,
  p.amount_krw,
  p.bank_memo,
  COALESCE(SUM(a.amount_krw), 0)                  AS allocated_krw,
  p.amount_krw - COALESCE(SUM(a.amount_krw), 0)   AS unallocated_krw,
  COUNT(a.id) FILTER (WHERE NOT a.confirmed)      AS unconfirmed_count
FROM settlement_payments p
LEFT JOIN payment_allocations a ON a.payment_id = p.id
GROUP BY p.id, p.paid_at, p.direction, p.amount_krw, p.bank_memo;

-- ─────────────────────────────────────────
-- RLS
-- AUTH_DISABLED: 022~024 와 동일. 인증 복구 시 AUTH_RESTORE 블록으로 교체.
-- ─────────────────────────────────────────
ALTER TABLE settlement_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "temp open access until auth restored" ON settlement_payments;
CREATE POLICY "temp open access until auth restored"
  ON settlement_payments FOR ALL
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "temp open access until auth restored" ON payment_allocations;
CREATE POLICY "temp open access until auth restored"
  ON payment_allocations FOR ALL
  USING (true) WITH CHECK (true);

/* AUTH_RESTORE
DROP POLICY "temp open access until auth restored" ON settlement_payments;
DROP POLICY "temp open access until auth restored" ON payment_allocations;

-- 지급 현황은 양사 대표가 함께 보므로 토에이도 읽기 가능, 쓰기는 에이원만.
CREATE POLICY "both sides can read payments"
  ON settlement_payments FOR SELECT
  USING (auth_role() IN ('a1_admin','a1_user','toei_user'));
CREATE POLICY "a1 can write payments"
  ON settlement_payments FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user'))
  WITH CHECK (auth_role() IN ('a1_admin','a1_user'));

CREATE POLICY "both sides can read allocations"
  ON payment_allocations FOR SELECT
  USING (auth_role() IN ('a1_admin','a1_user','toei_user'));
CREATE POLICY "a1 can write allocations"
  ON payment_allocations FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user'))
  WITH CHECK (auth_role() IN ('a1_admin','a1_user'));
*/
