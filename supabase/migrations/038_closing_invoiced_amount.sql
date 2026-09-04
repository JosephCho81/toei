-- 038_closing_invoiced_amount.sql
-- 최종정산의 실제 청구액. 2026-09-04 담당자 요청.
--
--   「실제 청구값과 지불상황 / 계산상 정확한 청구값과 지불상황 /
--    실제 청구값과 계산상 청구값의 차이」
--
-- 중간정산은 035 에서 이미 갈랐다(invoiced ≠ confirmed). 최종정산에는 그 칸이 없어
-- 같은 비교를 할 수 없었다. 세 금액을 나란히 세우려면 세 칸이 다 있어야 한다.
--
--   invoiced_amount_krw   실제로 청구서에 적어 보낸 금액 (사실)
--   confirmed_amount_krw  담당자가 확정한 금액 (판단)
--   시스템 재계산값        calculateClosing() — 저장하지 않는다
--
-- 비워 둔다. 채우는 것은 담당자 몫이고, 비어 있으면 화면이 「청구액 미등록」으로 부른다.
-- 확정금액을 복사해 넣지 않는다 — 넣는 순간 「청구와 확정이 같다」는 거짓이 기록된다.

ALTER TABLE closing_settlements
  ADD COLUMN IF NOT EXISTS invoiced_amount_krw numeric(15,0);

COMMENT ON COLUMN closing_settlements.invoiced_amount_krw IS
  '실제 청구액. 확정금액과 다를 수 있고, 다르면 그 차이가 곧 청구 오류다. 비어 있으면 청구 전.';
