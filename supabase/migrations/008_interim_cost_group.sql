ALTER TABLE interim_cost_items
  ADD COLUMN IF NOT EXISTS group_type TEXT
  DEFAULT 'customs'
  CHECK (group_type IN ('shipping', 'customs'));
