-- 020_drop_dead_columns.sql
-- 미사용 컬럼 및 뷰 제거

ALTER TABLE interim_settlements  DROP COLUMN IF EXISTS system_amount_krw;
ALTER TABLE closing_settlements  DROP COLUMN IF EXISTS system_amount_krw;

DROP VIEW IF EXISTS v_forwarding_quote_summary;
