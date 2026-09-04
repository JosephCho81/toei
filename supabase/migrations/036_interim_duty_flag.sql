-- 036_interim_duty_flag.sql
-- 관세 플래그. 2026-09-04 담당자 요청(전 차수 소급)으로 계산 규약이 바뀐다.
--
--   구규약  공급가 = 수입금액 + 비용 전체 + 항목부가세 − 수입부가세
--           합계  = 공급가 × 1.1
--
--   신규약  공급가 = 수입금액 + 비용(전부 VAT 별도) − 수입부가세 − 관세
--           합계  = 공급가 × 1.1 + 관세
--
-- 왜 플래그인가:
--   이름으로 가르면 안 된다. 「관세」로 시작하는 행이 40개인데 금액이 있는 건 3개뿐이고
--   (1·34·43차), 관세가 언제나 그 이름으로 들어온다는 보장도 없다.
--   is_import_vat 와 같은 방식으로 사실을 행에 적어 둔다.
--
-- 구방식(vat_mode = 'inclusive') 정산은 손대지 않는다 — 부가세를 분리할 수 없어
-- 관세만 빼면 합계가 어긋난다. 2·6·7차가 여기 해당하며 담당자 재입력 대상이다.

ALTER TABLE interim_cost_items
  ADD COLUMN IF NOT EXISTS is_duty boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN interim_cost_items.is_duty IS
  '관세. 공급가에서 빼고 매출부가세를 매긴 뒤 합계에 그대로 얹는다.';

COMMENT ON COLUMN interim_cost_items.is_vat_taxable IS
  '부가세가 별도로 붙는 항목. 그 부가세는 에이원 매입세액공제분이라 공급가에 넣지 않는다.';

-- 금액이 있는 관세 3건에 플래그를 세운다.
-- 0원 행 37개는 건드리지 않는다 — 계산에 영향이 없고, 플래그가 서면
-- 담당자가 나중에 금액을 넣을 때 관세로 잡히는 게 오히려 맞다. 다만 지금은
-- 「무엇을 바꿨는가」를 3건으로 좁혀 두는 편이 되돌리기 쉽다.
UPDATE interim_cost_items
   SET is_duty = true
 WHERE item_name LIKE '관세%'
   AND amount_krw <> 0;

-- RLS: 컬럼 추가라 정책 변경 없음 (interim_cost_items 는 034 이전 정책 그대로).

-- ─────────────────────────────────────────
-- 저장 RPC 도 관세 플래그를 받도록 다시 만든다.
-- 028 의 정의를 그대로 두고 컬럼만 늘렸다 — 잠금 검사·전체 삭제 후 재삽입 동작은 같다.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION save_interim_cost_items(
  p_interim_settlement_id uuid,
  p_items jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
BEGIN
  SELECT is_locked INTO v_locked
  FROM interim_settlements WHERE id = p_interim_settlement_id;

  IF v_locked IS NULL THEN
    RAISE EXCEPTION '중간정산을 찾을 수 없습니다: %', p_interim_settlement_id;
  END IF;
  IF v_locked THEN
    RAISE EXCEPTION '확정·잠금된 중간정산은 수정할 수 없습니다.';
  END IF;

  DELETE FROM interim_cost_items WHERE interim_settlement_id = p_interim_settlement_id;

  INSERT INTO interim_cost_items (
    interim_settlement_id, item_name, group_type, amount_krw,
    is_vat_taxable, vat_amount_krw, is_import_vat, is_duty, sort_order
  )
  SELECT
    p_interim_settlement_id,
    COALESCE(i->>'item_name', ''),
    CASE WHEN i->>'group_type' = 'shipping' THEN 'shipping' ELSE 'customs' END,
    COALESCE((i->>'amount_krw')::numeric, 0),
    COALESCE((i->>'is_vat_taxable')::boolean, false),
    COALESCE((i->>'vat_amount_krw')::numeric, 0),
    COALESCE((i->>'is_import_vat')::boolean, false),
    COALESCE((i->>'is_duty')::boolean, false),
    COALESCE((i->>'sort_order')::integer, 0)
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS i;
END $$;

GRANT EXECUTE ON FUNCTION save_interim_cost_items(uuid, jsonb) TO anon, authenticated, service_role;
