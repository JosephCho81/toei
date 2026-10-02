-- bundle_closing_1_3_8.sql — 1, 3~8차 최종정산을 묶음으로 묶는다. 042 실행 뒤에 돌린다.
--
-- 통장: 2023-02-23 출금 17,242,417 「하르탈레가 정산 (2차 제외 1~8차)」 — 지금은 kind='other'(차수 없음).
-- 계산서 한 장(공급가 15,674,925 + 세액 1,567,492)이라 차수별 금액이 없다 → 차수에 나누지 않고 묶음에 붙인다.
-- 청구액은 직원이 차수별로 넣는다. 금액은 하나도 바꾸지 않는다 — 배분이 가리키는 곳만 바뀐다.
--
-- 바뀌는 것: payment_allocations 1행 (kind other → closing, bundle_id 지정)
-- 새로 생기는 것: settlement_bundles 1행, settlement_bundle_rounds 7행
-- 그대로인 것: settlement_payments(통장), 차수별 청구·확정 금액, 다른 모든 배분

-- SQL 에디터의 검색 경로가 public 을 빼고 있으면 「relation "transactions" does not exist」가 난다 (2026-10-02).
-- 경로를 고정하고, 그래도 없으면 다른 프로젝트에서 돌린 것이므로 아무것도 만들기 전에 멈춘다.
SET search_path = public;
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NULL THEN
    RAISE EXCEPTION 'public.transactions 가 없습니다 — 다른 Supabase 프로젝트에서 실행 중인지 확인하세요';
  END IF;
END $$;

BEGIN;

DO $$
DECLARE
  v_payment  uuid;
  v_alloc    uuid;
  v_bundle   uuid;
  v_rounds   int;
BEGIN
  SELECT p.id, a.id INTO v_payment, v_alloc
    FROM settlement_payments p
    JOIN payment_allocations a ON a.payment_id = p.id
   WHERE p.paid_at = '2023-02-23' AND p.amount_krw = 17242417 AND p.direction = 'out'
     AND a.kind = 'other' AND a.amount_krw = 17242417;
  IF NOT FOUND THEN
    RAISE EXCEPTION '2023-02-23 17,242,417 other 배분을 찾지 못했습니다 — 이미 처리됐거나 원장이 바뀌었습니다';
  END IF;

  SELECT COUNT(*) INTO v_rounds FROM transactions WHERE round_no IN (1,3,4,5,6,7,8);
  IF v_rounds <> 7 THEN
    RAISE EXCEPTION '1, 3~8차 거래가 7건이 아니라 %건입니다', v_rounds;
  END IF;

  INSERT INTO settlement_bundles (kind, label, note)
  VALUES ('closing', '1, 3~8차 묶음',
          '계산서 1장 17,242,417 (공급가 15,674,925 + 세액 1,567,492) — 2차 제외. 청구 합계와의 차이는 내역 확인 예정')
  RETURNING id INTO v_bundle;

  INSERT INTO settlement_bundle_rounds (bundle_id, kind, transaction_id)
  SELECT v_bundle, 'closing', id FROM transactions WHERE round_no IN (1,3,4,5,6,7,8);

  UPDATE payment_allocations
     SET kind = 'closing', bundle_id = v_bundle, transaction_id = NULL, confirmed = true
   WHERE id = v_alloc;
END $$;

-- 확인: 묶음 1건 · 차수 7건 · 지급 17,242,417
SELECT label, jsonb_array_length(transaction_ids) AS rounds, paid_krw FROM v_settlement_bundle_status;

COMMIT;
