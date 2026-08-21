-- 025_restore_audit_triggers.sql
-- 006에서 audit_logs 테이블·함수는 만들어졌으나 트리거 3개가 실제 DB에 걸리지 않아
-- 감사 로그가 한 건도 쌓이지 않던 문제 복구.
-- (거래 44건·중간정산 31건이 존재하는데 audit_logs는 0건이었음)

-- ─────────────────────────────────────────
-- 감사 함수 재정의
-- SECURITY DEFINER + search_path 고정 (검색 경로 하이재킹 방지)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO audit_logs(table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()   -- 로그인 비활성(AUTH_DISABLED) 동안은 NULL로 기록된다
  );
  RETURN NULL;
END;
$$;

-- ─────────────────────────────────────────
-- 트리거 재생성
-- 006은 CREATE OR REPLACE TRIGGER(PG14+)를 썼다 → DROP + CREATE로 바꿔 재실행 안전성 확보
-- ─────────────────────────────────────────
DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_interim_settlements ON interim_settlements;
CREATE TRIGGER audit_interim_settlements
  AFTER INSERT OR UPDATE OR DELETE ON interim_settlements
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_closing_settlements ON closing_settlements;
CREATE TRIGGER audit_closing_settlements
  AFTER INSERT OR UPDATE OR DELETE ON closing_settlements
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- ─────────────────────────────────────────
-- 적용 확인용 (실행 후 3행이 tgenabled='O' 로 나와야 정상)
-- SELECT tgrelid::regclass, tgname, tgenabled
--   FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'audit_%';
-- ─────────────────────────────────────────
