-- fix_gross_customs_items.sql
-- 통관보수료·검역수수료·정밀검역비가 「부가세 포함 총액」으로 적재된 62건을
-- 공급가(VAT 별도)로 되돌린다. 2026-09-04 담당자 확인:
--   「서류상 토탈금액 / 부가세 별도 금액 2종류 혼재 기재, 실제로는 부가세 별도로 나가는 항목」
--
-- 왜 필요한가:
--   interim_cost_items.amount_krw 는 스키마상 언제나 공급가다. 36차부터는 그렇게 들어갔지만
--   (is_vat_taxable = true) 그 이전 차수는 총액이 그대로 들어가 공급가가 부풀어 있다.
--   계산식만 바꾸면 이 62건은 여전히 부가세를 머금은 채 매출부가세를 한 번 더 맞는다.
--
-- 무엇이 바뀌나:
--   amount_krw    7,837,300 → 7,124,818  (반올림, 원 단위)
--   is_vat_taxable  false → true          (부가세가 별도로 붙는 항목이라는 사실 기록)
--   분리되는 부가세 712,482원 — 신규약에서는 공급가에 더하지 않는다
--
-- 무엇이 안 바뀌나:
--   · vat_mode = 'inclusive' 인 2·6·7차 4건(570,900원)은 제외했다. 부가세를 분리할 수 없는
--     구방식이라 여기서 건드리면 합계가 어긋난다 — 담당자 재입력 대상이다
--   · 이미 is_vat_taxable = true 인 12건(36차 이후)은 제외했다. 또 나누면 이중 차감이다
--   · confirmed_amount_krw 는 손대지 않는다. 담당자가 재검토하며 직접 입력한다
--
-- 되돌리기: amount_krw 를 ROUND(amount_krw * 1.1) 로 올리고 is_vat_taxable 을 false 로.
--           반올림 때문에 원 단위가 완전히 같지는 않으므로 아래 백업 테이블을 쓸 것.

BEGIN;

-- 되돌릴 수 있게 원본을 남긴다.
CREATE TABLE IF NOT EXISTS interim_cost_items_backup_20260904 AS
SELECT ci.*, now() AS backed_up_at
  FROM interim_cost_items ci
  JOIN interim_settlements s ON s.id = ci.interim_settlement_id
 WHERE s.vat_mode <> 'inclusive'
   AND ci.is_vat_taxable = false
   AND ci.is_import_vat  = false
   AND ci.amount_krw <> 0
   AND (ci.item_name LIKE '통관보수료%' OR ci.item_name LIKE '검역수수료%' OR ci.item_name LIKE '정밀검역비%');

UPDATE interim_cost_items ci
   SET amount_krw     = ROUND(ci.amount_krw / 1.1),
       is_vat_taxable = true,
       vat_amount_krw = ci.amount_krw - ROUND(ci.amount_krw / 1.1)
  FROM interim_settlements s
 WHERE s.id = ci.interim_settlement_id
   AND s.vat_mode <> 'inclusive'
   AND ci.is_vat_taxable = false
   AND ci.is_import_vat  = false
   AND ci.amount_krw <> 0
   AND (ci.item_name LIKE '통관보수료%' OR ci.item_name LIKE '검역수수료%' OR ci.item_name LIKE '정밀검역비%');

-- 62건이어야 한다. 다르면 롤백하고 확인할 것.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM interim_cost_items_backup_20260904;
  IF n <> 62 THEN
    RAISE EXCEPTION '대상이 62건이 아니라 %건입니다 — 확인 후 다시 실행하세요', n;
  END IF;
END $$;

COMMIT;
