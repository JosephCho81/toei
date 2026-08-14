-- 022_transaction_amount_checks.sql
-- 품목 소계 아래에서 토에이 측 자료 금액과 대조하기 위한 입력행.
-- 한 거래에 여러 건 추가 가능(자료가 여러 버전으로 올 수 있음).

CREATE TABLE IF NOT EXISTS transaction_amount_checks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  label           text        NOT NULL DEFAULT '토에이 입력금액',
  amount_usd      numeric(15,4),
  note            text,       -- 차액 발생 사유 / 검토 메모
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_amount_checks_tx
  ON transaction_amount_checks(transaction_id);

CREATE TRIGGER trg_transaction_amount_checks_updated_at
  BEFORE UPDATE ON transaction_amount_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- RLS
-- AUTH_DISABLED: 로그인 기능 비활성 상태(proxy.ts)라 anon 키로 접근한다.
-- 인증 복구 시 아래 임시 정책을 삭제하고 AUTH_RESTORE 블록을 적용할 것.
-- ─────────────────────────────────────────
ALTER TABLE transaction_amount_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp open access until auth restored"
  ON transaction_amount_checks FOR ALL
  USING (true) WITH CHECK (true);

/* AUTH_RESTORE
DROP POLICY "temp open access until auth restored" ON transaction_amount_checks;

CREATE POLICY "a1 can manage amount checks"
  ON transaction_amount_checks FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user'));

CREATE POLICY "toei can read amount checks"
  ON transaction_amount_checks FOR SELECT
  USING (auth_role() = 'toei_user');
*/
