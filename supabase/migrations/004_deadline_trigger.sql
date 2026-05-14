-- 1. transactions 컬럼 추가
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS a1_payment_date  date,
  ADD COLUMN IF NOT EXISTS lc_expiry_date   date,
  ADD COLUMN IF NOT EXISTS lc_status        text
    CHECK (lc_status IN ('pending','opened','amended','expired','utilized')),
  ADD COLUMN IF NOT EXISTS logistics_status text
    CHECK (logistics_status IN ('pending','shipped','arrived','customs_cleared')),
  ADD COLUMN IF NOT EXISTS document_status  text
    CHECK (document_status IN ('pending','received','submitted','approved'));

-- 2. settlement_deadlines: check 제약 갱신
ALTER TABLE settlement_deadlines
  DROP CONSTRAINT IF EXISTS settlement_deadlines_deadline_type_check;
ALTER TABLE settlement_deadlines
  ADD CONSTRAINT settlement_deadlines_deadline_type_check
  CHECK (deadline_type IN ('lc_payment','interim','closing','custom','interim_due','closing_due'));

-- 3. upsert용 unique 제약
ALTER TABLE settlement_deadlines
  ADD CONSTRAINT settlement_deadlines_tx_type_key
  UNIQUE (transaction_id, deadline_type);

-- 4. 트리거 함수
CREATE OR REPLACE FUNCTION sync_settlement_deadlines()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.a1_payment_date IS NOT NULL THEN
    INSERT INTO settlement_deadlines (transaction_id, deadline_type, due_date)
    VALUES (NEW.id, 'interim_due', NEW.a1_payment_date)
    ON CONFLICT (transaction_id, deadline_type)
    DO UPDATE SET due_date = EXCLUDED.due_date;

    INSERT INTO settlement_deadlines (transaction_id, deadline_type, due_date)
    VALUES (NEW.id, 'closing_due', NEW.a1_payment_date + INTERVAL '55 days')
    ON CONFLICT (transaction_id, deadline_type)
    DO UPDATE SET due_date = EXCLUDED.due_date;
  END IF;

  IF NEW.lc_expiry_date IS NOT NULL THEN
    INSERT INTO settlement_deadlines (transaction_id, deadline_type, due_date)
    VALUES (NEW.id, 'lc_payment', NEW.lc_expiry_date)
    ON CONFLICT (transaction_id, deadline_type)
    DO UPDATE SET due_date = EXCLUDED.due_date;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. 트리거
DROP TRIGGER IF EXISTS trg_sync_settlement_deadlines ON transactions;
CREATE TRIGGER trg_sync_settlement_deadlines
  AFTER INSERT OR UPDATE OF a1_payment_date, lc_expiry_date
  ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_settlement_deadlines();

-- 6. 기존 데이터 소급 (a1_payment_date 입력 후 자동 적용)
UPDATE transactions SET updated_at = NOW() WHERE a1_payment_date IS NOT NULL;
