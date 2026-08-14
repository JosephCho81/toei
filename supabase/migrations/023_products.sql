-- 023_products.sql
-- 품목 마스터. 거래 입력 시 직접 타이핑 대신 선택하고,
-- 선택하면 재질(glove_type)·색상·단위가 자동 입력되도록 한다.
-- size_sequence: 행 추가 시 자동으로 채울 사이즈 순서 (예: {XS,S,M,L})

CREATE TABLE IF NOT EXISTS products (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL UNIQUE,   -- 품목명(사양). transaction_items.spec 과 동일 값
  glove_type     text,                          -- 재질: 니트릴 / 라텍스 / 비닐
  color          text,
  default_unit   text        NOT NULL DEFAULT 'Ct',
  size_sequence  text[]      NOT NULL DEFAULT '{S,M,L}',
  notes          text,
  is_active      boolean     NOT NULL DEFAULT true,
  sort_order     integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, sort_order);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- RLS
-- AUTH_DISABLED: 022 와 동일. 인증 복구 시 AUTH_RESTORE 블록으로 교체.
-- ─────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp open access until auth restored"
  ON products FOR ALL
  USING (true) WITH CHECK (true);

/* AUTH_RESTORE
DROP POLICY "temp open access until auth restored" ON products;

CREATE POLICY "a1 can manage products"
  ON products FOR ALL
  USING (auth_role() IN ('a1_admin','a1_user'));

CREATE POLICY "toei can read products"
  ON products FOR SELECT
  USING (auth_role() = 'toei_user');
*/
