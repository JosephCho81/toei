-- 035_interim_invoiced_amount.sql
-- 「실제로 청구한 금액」과 「시스템이 계산한 금액」을 구분한다.
--
-- 지급 현황 화면을 붙이면서 드러난 문제다. 잔액을 confirmed_amount_krw 로 계산했더니
-- 전 차수에 ±수만~수백만원이 깔렸다. 미지급이 아니라 계산 차이였다.
--   35차: confirmed 139,774,360 / 실제 청구·지급 134,229,865  → 5,544,495 는 검산 차이
--   15차: confirmed  60,692,376 / 실제 청구      58,989,873  → 1,702,503 는 검산 차이
--   6·7차: vat_mode='inclusive' 라 confirmed 에 매출부가세가 빠져 있는데,
--          통장에는 부가세 포함액이 나갔다 (6차 113,128,700 × 1.1 ≒ 지급 124,441,593)
--
-- 어느 쪽도 지우지 않는다. 확정값은 정산 근거로 남기고, 잔액은 실제 청구액으로 계산한다.
-- 둘의 차이가 곧 담당자 의견 ①「검산 차이」이며 화면에서 그대로 보여준다.

ALTER TABLE interim_settlements
  ADD COLUMN IF NOT EXISTS invoiced_amount_krw numeric(15,0);

COMMENT ON COLUMN interim_settlements.invoiced_amount_krw IS
  '세금계산서로 실제 청구한 금액(부가세 포함). 통장에서 나간 돈의 근거다. '
  'NULL 이면 아직 청구 전. confirmed_amount_krw(시스템 확정값)와 다를 수 있고, 그 차이는 지우지 않는다.';
