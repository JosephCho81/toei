-- 017_source_documents.sql
-- 원본 문서(인보이스/세관) 파싱 데이터 저장 테이블

CREATE TABLE IF NOT EXISTS source_documents (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  round_no    integer     NOT NULL,
  source_type text        NOT NULL CHECK (source_type IN ('invoice','customs')),
  item_name   text        NOT NULL,
  amount_krw  numeric     NOT NULL,
  invoice_no  text,
  raw_line    text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_documents_round_no
  ON source_documents(round_no);

-- ─────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────
ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "a1 can manage source_documents"
  ON source_documents FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user'));
