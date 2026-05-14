-- transactions: 입금일(A1), LC만기, 수입금액 실제/이론값 추가
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS a1_payment_date          date,
  ADD COLUMN IF NOT EXISTS lc_expiry_date            date,
  ADD COLUMN IF NOT EXISTS import_amount_usd_actual  numeric(15,4),
  ADD COLUMN IF NOT EXISTS import_amount_usd_theoretical numeric(15,4);

-- containers: ETA 출처(api/manual) 추가
ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS eta_source text CHECK (eta_source IN ('api', 'manual'));
