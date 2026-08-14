-- 024_transaction_flags.sql
-- 거래목록에서 오류 항목을 표시하고 쌍방이 검토 결과를 남기기 위한 플래그/메모.
-- raised_by 는 인증 복구 후 'toei' | 'a1' 을 기록한다(현재는 단일 입력자라 null).

CREATE TABLE IF NOT EXISTS transaction_flags (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id      uuid        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  transaction_item_id uuid        REFERENCES transaction_items(id) ON DELETE SET NULL,
  field               text        NOT NULL DEFAULT '기타'
                      CHECK (field IN ('금액','품목','수량','기타')),
  memo                text,
  status              text        NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','resolved')),
  raised_by           text        CHECK (raised_by IN ('toei','a1')),
  resolved_memo       text,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_flags_tx_status
  ON transaction_flags(transaction_id, status);

CREATE TRIGGER trg_transaction_flags_updated_at
  BEFORE UPDATE ON transaction_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- RLS
-- AUTH_DISABLED: 022/023 과 동일. 인증 복구 시 AUTH_RESTORE 블록으로 교체.
-- ─────────────────────────────────────────
ALTER TABLE transaction_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp open access until auth restored"
  ON transaction_flags FOR ALL
  USING (true) WITH CHECK (true);

/* AUTH_RESTORE
DROP POLICY "temp open access until auth restored" ON transaction_flags;

-- 오류 검토는 쌍방이 함께 하므로 토에이도 읽기·쓰기 가능
CREATE POLICY "both sides can manage flags"
  ON transaction_flags FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user','toei_user'))
  WITH CHECK (auth_role() IN ('a1_admin','a1_user','toei_user'));
*/
