CREATE TABLE freight_invoice_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  uuid          NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  invoice_no      text,
  item_no         integer,
  item_name       text,
  currency        text,
  exchange_rate   numeric,
  rate            numeric,
  quantity        numeric,
  amount_cur      numeric,
  amount_krw      numeric,
  vat_amount_krw  numeric,
  is_vat_taxable  boolean       DEFAULT false,
  sort_order      integer,
  created_at      timestamptz   DEFAULT now()
);

CREATE INDEX freight_invoice_items_transaction_id_idx
  ON freight_invoice_items (transaction_id);
