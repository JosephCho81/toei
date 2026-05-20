CREATE TABLE forwarding_quote_items (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  forwarding_quote_id  uuid          NOT NULL REFERENCES forwarding_quotes(id) ON DELETE CASCADE,
  item_no              integer,
  item_name            text,
  currency             text,
  exchange_rate        numeric,
  rate                 numeric,
  amount_cur           numeric,
  amount_krw           numeric,
  vat_amount_krw       numeric,
  is_vat_taxable       boolean       DEFAULT false,
  sort_order           integer,
  created_at           timestamptz   DEFAULT now()
);

CREATE INDEX forwarding_quote_items_forwarding_quote_id_idx
  ON forwarding_quote_items (forwarding_quote_id);
