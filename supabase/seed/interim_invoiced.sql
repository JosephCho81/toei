-- interim_invoiced.sql
-- 실제로 토에이에 청구된 금액. 「수기 정산 비교.xlsx · 중간정산 비교」의 「토에이 청구금액」 열이다.
--
-- interim_settlements.confirmed_amount_krw 와 다르다:
--   confirmed_amount_krw = 시스템이 계산·확정한 값 (담당자 검산값과 같은 계열)
--   invoiced_amount_krw  = 세금계산서로 실제 청구한 값 = 통장에서 나간 돈의 근거
-- 둘의 차이가 담당자 의견 ①「검산 차이」다. 어느 쪽도 지우지 않고 나란히 둔다.
--
-- 40·41·42·43차는 아직 청구 전이라 비운다 — 화면에서 「청구 예정」으로 잡힌다.

UPDATE interim_settlements s SET invoiced_amount_krw = v.amt
FROM (VALUES
  (1, 92028685::numeric),
  (2, 131123840::numeric),
  (3, 119372664::numeric),
  (4, 115221631::numeric),
  (5, 116586269::numeric),
  (6, 124441593::numeric),
  (7, 127055341::numeric),
  (8, 121093808::numeric),
  (9, 126923819::numeric),
  (10, 88290987::numeric),
  (11, 87708402::numeric),
  (12, 94663679::numeric),
  (13, 89765056::numeric),
  (14, 94617875::numeric),
  (15, 58989873::numeric),
  (16, 95030014::numeric),
  (17, 92945160::numeric),
  (18, 96338007::numeric),
  (19, 96632917::numeric),
  (20, 55609228::numeric),
  (21, 58174017::numeric),
  (22, 58491328::numeric),
  (23, 144734206::numeric),
  (24, 142125615::numeric),
  (25, 61542909::numeric),
  (26, 65666654::numeric),
  (27, 63664226::numeric),
  (28, 134765702::numeric),
  (29, 57657014::numeric),
  (30, 107668550::numeric),
  (31, 57840273::numeric),
  (32, 118824787::numeric),
  (33, 140760202::numeric),
  (34, 98233661::numeric),
  (35, 134229923::numeric),
  (36, 124384618::numeric),
  (37, 207895876::numeric),
  (38, 136883194::numeric),
  (39, 136822694::numeric)
) AS v(rno, amt), transactions t
WHERE t.round_no = v.rno AND s.transaction_id = t.id
  AND s.invoiced_amount_krw IS DISTINCT FROM v.amt;
