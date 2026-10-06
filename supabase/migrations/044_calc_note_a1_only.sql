-- 044_calc_note_a1_only.sql
-- 계산금액 차이 사유(calc_diff_note)는 한국에이원만 고친다 (담당자 2026-10-06).
-- 시스템 계산값과 청구를 맞춰 본 쪽이 적는 칸인데, 토에이 계정에서 지우고 고칠 수 있었다.
-- 040 의 칸 제한 트리거에서 허용 칸을 금액 차이 사유(notes)만 남긴다. 화면도 막지만 실제로 막는 곳은 여기다.

DROP TRIGGER IF EXISTS zz_guard_toei_columns ON interim_settlements;
CREATE TRIGGER zz_guard_toei_columns BEFORE UPDATE ON interim_settlements
  FOR EACH ROW EXECUTE FUNCTION guard_toei_columns('notes', 'updated_at');

DROP TRIGGER IF EXISTS zz_guard_toei_columns ON closing_settlements;
CREATE TRIGGER zz_guard_toei_columns BEFORE UPDATE ON closing_settlements
  FOR EACH ROW EXECUTE FUNCTION guard_toei_columns('notes', 'updated_at');
