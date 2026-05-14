-- Add is_completed to settlement_deadlines
ALTER TABLE settlement_deadlines
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid REFERENCES auth.users(id),
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- Audit trigger function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs(table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE OR REPLACE TRIGGER audit_interim_settlements
  AFTER INSERT OR UPDATE OR DELETE ON interim_settlements
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE OR REPLACE TRIGGER audit_closing_settlements
  AFTER INSERT OR UPDATE OR DELETE ON closing_settlements
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
