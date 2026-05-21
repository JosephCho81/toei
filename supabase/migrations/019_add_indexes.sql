-- 019_add_indexes.sql
-- FK 컬럼 인덱스 추가 (쿼리 성능 개선)

CREATE INDEX IF NOT EXISTS idx_interim_cost_items_settlement_id
  ON interim_cost_items(interim_settlement_id);

CREATE INDEX IF NOT EXISTS idx_closing_cost_items_settlement_id
  ON closing_cost_items(closing_settlement_id);

CREATE INDEX IF NOT EXISTS idx_lc_fee_items_settlement_id
  ON lc_fee_items(closing_settlement_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id
  ON transaction_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_forwarding_quotes_transaction_id
  ON forwarding_quotes(transaction_id);

CREATE INDEX IF NOT EXISTS idx_settlement_deadlines_transaction_id
  ON settlement_deadlines(transaction_id);
