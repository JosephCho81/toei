-- fix_group_10_12_allocation.sql
-- 10~12차 묶음 지급(2023-04-28 150,000,000 / 04-30 120,621,502)의 차수별 배분을
-- 통장 적요의 「공급가」 기준에서 실제 청구액 기준으로 다시 맞춘다.
--
-- 왜: 적요에 적힌 공급가×1.1 (10차 88,290,986 / 11차 88,654,097 / 12차 93,676,419) 과
--     세금계산서 청구액 (88,290,987 / 87,708,402 / 94,663,679) 이 서로 다르다.
--     잔액은 청구액 기준이어야 하므로 청구액으로 앞에서부터 채우고,
--     모자라는 41,566원이 12차 잔액으로 남게 한다.
--
-- confirmed 는 여전히 false 다 — 이 배분은 담당자 확인을 받아야 한다.

BEGIN;

DELETE FROM payment_allocations
WHERE payment_id IN ('966b246f-96a2-5e6f-92bb-929fb35f26ca', '1b22ea2a-8a4e-5f78-98db-4f7a36d15472');

INSERT INTO payment_allocations (payment_id, transaction_id, kind, amount_krw, confirmed, note)
SELECT v.pid, t.id, 'interim', v.amt, false, '묶음 지급 — 실제 청구액 기준 초기 배분'
FROM (VALUES
  ('966b246f-96a2-5e6f-92bb-929fb35f26ca'::uuid, 10, 88290987::numeric),
  ('966b246f-96a2-5e6f-92bb-929fb35f26ca'::uuid, 11, 61709013::numeric),
  ('1b22ea2a-8a4e-5f78-98db-4f7a36d15472'::uuid, 11, 25999389::numeric),
  ('1b22ea2a-8a4e-5f78-98db-4f7a36d15472'::uuid, 12, 94622113::numeric)
) AS v(pid, rno, amt), transactions t
WHERE t.round_no = v.rno;

COMMIT;
