-- 013_fix_trigger.sql
-- settlement_status 이중 업데이트 버그 수정
-- 기존 트리거는 AFTER UPDATE only → INSERT 시 동작 안 함
-- 앱 코드 수동 UPDATE와 충돌하여 상태 불일치 발생
-- 해결: INSERT OR UPDATE 처리 + 양 테이블 상태를 모두 읽어 재계산

-- 기존 트리거 삭제
DROP TRIGGER IF EXISTS trg_sync_status_from_interim ON interim_settlements;
DROP TRIGGER IF EXISTS trg_sync_status_from_closing ON closing_settlements;

-- 트리거 함수 재정의
-- closing > interim 우선순위로 전체 상태를 재계산하여 transactions에 반영
CREATE OR REPLACE FUNCTION sync_transaction_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_status     text;
  v_closing_locked bool := false;
  v_closing_exists bool := false;
  v_interim_locked bool := false;
  v_interim_exists bool := false;
BEGIN
  SELECT true, coalesce(is_locked, false)
  INTO v_closing_exists, v_closing_locked
  FROM closing_settlements
  WHERE transaction_id = NEW.transaction_id;

  SELECT true, coalesce(is_locked, false)
  INTO v_interim_exists, v_interim_locked
  FROM interim_settlements
  WHERE transaction_id = NEW.transaction_id;

  IF v_closing_locked THEN
    v_new_status := 'closing_done';
  ELSIF v_closing_exists THEN
    v_new_status := 'closing_saved';
  ELSIF v_interim_locked THEN
    v_new_status := 'interim_done';
  ELSIF v_interim_exists THEN
    v_new_status := 'interim_saved';
  ELSE
    v_new_status := 'pending';
  END IF;

  UPDATE transactions
  SET
    settlement_status = v_new_status,
    is_locked         = (v_new_status = 'closing_done')
  WHERE id = NEW.transaction_id;

  RETURN NEW;
END;
$$;

-- 트리거 재생성 (INSERT OR UPDATE 모두 처리)
CREATE TRIGGER trg_sync_status_from_interim
  AFTER INSERT OR UPDATE ON interim_settlements
  FOR EACH ROW EXECUTE FUNCTION sync_transaction_status();

CREATE TRIGGER trg_sync_status_from_closing
  AFTER INSERT OR UPDATE ON closing_settlements
  FOR EACH ROW EXECUTE FUNCTION sync_transaction_status();

-- 기존 데이터 재동기화
-- 마이그레이션 시점에 실제 상태와 일치하도록 전체 보정
UPDATE transactions t
SET
  settlement_status = CASE
    WHEN EXISTS (
      SELECT 1 FROM closing_settlements cs
      WHERE cs.transaction_id = t.id AND cs.is_locked = true
    ) THEN 'closing_done'
    WHEN EXISTS (
      SELECT 1 FROM closing_settlements cs
      WHERE cs.transaction_id = t.id
    ) THEN 'closing_saved'
    WHEN EXISTS (
      SELECT 1 FROM interim_settlements ins
      WHERE ins.transaction_id = t.id AND ins.is_locked = true
    ) THEN 'interim_done'
    WHEN EXISTS (
      SELECT 1 FROM interim_settlements ins
      WHERE ins.transaction_id = t.id
    ) THEN 'interim_saved'
    ELSE 'pending'
  END,
  is_locked = EXISTS (
    SELECT 1 FROM closing_settlements cs
    WHERE cs.transaction_id = t.id AND cs.is_locked = true
  );
