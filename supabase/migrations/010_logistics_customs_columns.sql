-- containers 테이블: 물류 정보 컬럼 추가
ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS pol             text,
  ADD COLUMN IF NOT EXISTS pod             text,
  ADD COLUMN IF NOT EXISTS hbl_no          text,
  ADD COLUMN IF NOT EXISTS mbl_no          text,
  ADD COLUMN IF NOT EXISTS weight_kgs      numeric,
  ADD COLUMN IF NOT EXISTS cbm             numeric,
  ADD COLUMN IF NOT EXISTS forwarder_name  text,
  ADD COLUMN IF NOT EXISTS forwarder_contact text;

-- transactions 테이블: 통관 정보 컬럼 추가
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customs_declaration_no text,
  ADD COLUMN IF NOT EXISTS customs_amount_usd     numeric,
  ADD COLUMN IF NOT EXISTS customs_taxable_krw    numeric;
