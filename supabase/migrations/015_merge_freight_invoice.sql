-- 015_merge_freight_invoice.sql
-- freight_invoice_items → forwarding_quote_items 통합
-- 동일 PDF에서 나온 데이터의 중복 테이블 구조 제거

-- ─────────────────────────────────────────
-- 1. forwarding_quote_items 컬럼 추가
-- ─────────────────────────────────────────
ALTER TABLE forwarding_quote_items
  ADD COLUMN item_type  text NOT NULL DEFAULT 'invoice'
    CHECK (item_type IN ('quote', 'invoice')),
  ADD COLUMN quantity   numeric,
  ADD COLUMN invoice_no text;

-- 기존 행은 DEFAULT 'invoice'로 자동 처리됨

-- ─────────────────────────────────────────
-- 2. v_forwarding_quote_summary 뷰 생성
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_forwarding_quote_summary AS
SELECT
  forwarding_quote_id,
  SUM(amount_krw) FILTER (WHERE item_type = 'quote')   AS quote_amount_krw,
  SUM(amount_krw) FILTER (WHERE item_type = 'invoice') AS actual_amount_krw
FROM forwarding_quote_items
GROUP BY forwarding_quote_id;

-- ─────────────────────────────────────────
-- 3. forwarding_quotes에서 집계 컬럼 DROP (뷰로 대체)
-- ─────────────────────────────────────────
ALTER TABLE forwarding_quotes
  DROP COLUMN quote_amount_krw,
  DROP COLUMN actual_amount_krw;

-- ─────────────────────────────────────────
-- 4. freight_invoice_items → forwarding_quote_items 이전
--    중복 방지: 동일 forwarding_quote_id + item_name + amount_krw 조합 제외
-- ─────────────────────────────────────────
INSERT INTO forwarding_quote_items (
  forwarding_quote_id,
  item_type,
  invoice_no,
  item_no,
  item_name,
  currency,
  exchange_rate,
  rate,
  quantity,
  amount_cur,
  amount_krw,
  vat_amount_krw,
  is_vat_taxable,
  sort_order
)
SELECT
  fq.id,
  'invoice',
  fi.invoice_no,
  fi.item_no,
  fi.item_name,
  fi.currency,
  fi.exchange_rate,
  fi.rate,
  fi.quantity,
  fi.amount_cur,
  fi.amount_krw,
  fi.vat_amount_krw,
  fi.is_vat_taxable,
  fi.sort_order
FROM freight_invoice_items fi
JOIN forwarding_quotes fq ON fq.transaction_id = fi.transaction_id
WHERE NOT EXISTS (
  SELECT 1 FROM forwarding_quote_items fqi2
  WHERE fqi2.forwarding_quote_id = fq.id
    AND fqi2.item_name = fi.item_name
    AND fqi2.amount_krw = fi.amount_krw
);

-- ─────────────────────────────────────────
-- 5. freight_invoice_items 테이블 DROP
-- ─────────────────────────────────────────
DROP TABLE freight_invoice_items;
