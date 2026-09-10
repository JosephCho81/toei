-- apply_20260910_manager_decisions.sql
-- 담당자 확정 사항 반영 (2026-09-10). **실행 전 사용자 승인 필요.**
--
-- 두 문장은 서로 독립이다. 한 트랜잭션으로 묶지 않아도 된다.

-- ─────────────────────────────────────────────────────────────
-- 1. 36차부터 엑셀 청구금액을 비운다
--
--    담당자: 「36차부터 청구금액 삭제. 엑셀값 사용 X, 직접 계산 후 맞추어 검산 후 진행.
--             청구값은 직원 검수 → 최차장님 검토 → 계산서 검토 후 별도 입력.」
--
--    대상 4건 (40~44차는 이미 비어 있다):
--      36차 124,384,618 · 37차 207,895,876 · 38차 136,883,194 · 39차 136,822,694
--
--    비우면 그 차수의 남은 금액은 계산값 기준으로 선다 (lib/data/payments.ts 의 basisKrw).
--    36차는 126,431,030 − 116,431,030 = 10,000,000 원이 남는다.
--
--    되돌리려면 supabase/seed/interim_invoiced.sql 의 36~39차 값을 다시 넣는다.
-- ─────────────────────────────────────────────────────────────

UPDATE interim_settlements s
   SET invoiced_amount_krw = NULL,
       updated_at = now()
  FROM transactions t
 WHERE t.id = s.transaction_id
   AND t.round_no >= 36
   AND s.invoiced_amount_krw IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. 최종정산 29차부터 공급가 100원 절사 (신방식 전환)
--
--    담당자: 「최종정산도 절사를 하되 기존 정산금액은 두고 새로 정산하는 29차부터
--             정산적용 (공급가 100원 절사).」
--
--    구방식(inclusive)은 절사가 최종가에 걸린다 — 부가세를 분리할 수 없어 공급가 칸이 없다.
--    신방식으로 넘기면 공급가에 절사가 걸리고 부가세는 절사된 공급가의 10% 로 나온다.
--    1~28차는 손대지 않는다.
--
--    아래 금액은 lib/calculations/closing.ts 를 라이브 DB 값으로 그대로 돌려 낸 것이다.
--    차수당 변동은 -80 ~ +60 원, 여섯 건 합계 -70 원.
--
--      차수   지금 확정      바꾼 뒤       차이
--      29     2,828,800     2,828,760     -40
--      30     2,858,100     2,858,020     -80
--      31     1,964,700     1,964,710     +10
--      32     3,117,900     3,117,840     -60
--      33     5,080,200     5,080,240     +40
--      34      -290,900      -290,840     +60
-- ─────────────────────────────────────────────────────────────

UPDATE closing_settlements c
   SET vat_mode             = 'exclusive',
       rounding_policy      = 'floor_100',
       supply_amount_krw    = v.supply,
       vat_amount_krw       = v.vat,
       confirmed_amount_krw = v.supply + v.vat,
       updated_at           = now()
  FROM (VALUES
    (29,  2571600::numeric,  257160::numeric),
    (30,  2598200::numeric,  259820::numeric),
    (31,  1786100::numeric,  178610::numeric),
    (32,  2834400::numeric,  283440::numeric),
    (33,  4618400::numeric,  461840::numeric),
    (34,  -264400::numeric,  -26440::numeric)
  ) AS v(round_no, supply, vat)
  JOIN transactions t ON t.round_no = v.round_no
 WHERE c.transaction_id = t.id;

-- 확인용 — 실행 후 여섯 행이 아래대로 나와야 한다
-- SELECT t.round_no, c.vat_mode, c.rounding_policy,
--        c.supply_amount_krw, c.vat_amount_krw, c.confirmed_amount_krw
--   FROM closing_settlements c JOIN transactions t ON t.id = c.transaction_id
--  WHERE t.round_no BETWEEN 29 AND 34 ORDER BY t.round_no;
