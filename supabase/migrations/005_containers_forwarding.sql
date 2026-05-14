-- containers 컬럼 추가
ALTER TABLE containers
  ADD COLUMN IF NOT EXISTS bl_no            text,
  ADD COLUMN IF NOT EXISTS lc_number        text,
  ADD COLUMN IF NOT EXISTS container_size   text CHECK (container_size IN ('20ft','40ft','40hc')),
  ADD COLUMN IF NOT EXISTS carton_count     integer,
  ADD COLUMN IF NOT EXISTS actual_departure date;

-- 포워딩 견적 테이블
CREATE TABLE forwarding_quotes (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id      uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  forwarder_name      text NOT NULL DEFAULT '오션마스터',
  quote_date          date,
  quote_amount_krw    numeric(15,0),
  actual_amount_krw   numeric(15,0),
  notes               text,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_forwarding_quotes_updated_at
  BEFORE UPDATE ON forwarding_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
