-- 030_audit_child_tables.sql
-- 025의 트리거 3개는 부모 행(transactions / interim_settlements / closing_settlements)만 잡는다.
-- 금액이 실제로 들어있는 자식 테이블(LC수수료·비용항목) 편집은 놓쳐서
-- 24·32차 「저장 후 LC수수료 수정」 유형의 오염을 추적하지 못한다.
-- 전제: 025가 먼저 적용되어 log_audit_event() 가 존재해야 한다.

DROP TRIGGER IF EXISTS audit_lc_fee_items ON lc_fee_items;
CREATE TRIGGER audit_lc_fee_items
  AFTER INSERT OR UPDATE OR DELETE ON lc_fee_items
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_closing_cost_items ON closing_cost_items;
CREATE TRIGGER audit_closing_cost_items
  AFTER INSERT OR UPDATE OR DELETE ON closing_cost_items
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_interim_cost_items ON interim_cost_items;
CREATE TRIGGER audit_interim_cost_items
  AFTER INSERT OR UPDATE OR DELETE ON interim_cost_items
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_containers ON containers;
CREATE TRIGGER audit_containers
  AFTER INSERT OR UPDATE OR DELETE ON containers
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 감사 로그는 앱에서 읽기 전용으로만 쓴다
-- (app/(app)/audit-logs, app/(app)/settings/audit, app/api/audit-logs 모두 select).
-- 트리거 함수가 SECURITY DEFINER라 회수해도 기록은 계속된다.
REVOKE INSERT, UPDATE, DELETE ON audit_logs FROM anon, authenticated;

-- 특정 정산 행의 변경 이력 추적용
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
