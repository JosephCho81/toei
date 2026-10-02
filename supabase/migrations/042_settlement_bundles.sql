-- 042_settlement_bundles.sql
-- 묶음 정산 — 계산서 한 장으로 여러 차수를 한 번에 정산한 건. 2026-10-02.
--
-- 왜 필요한가:
--   1, 3~8차 최종정산은 계산서 한 장(17,242,417)으로 끝났고 차수별 금액이 없다.
--   payment_allocations 는 차수 단위라 이 돈을 차수에 나눠 붙이려면 금액을 지어내야 하고,
--   1·6·7차는 환급 차수라 양수 배분으로는 표현조차 안 된다.
--   그래서 이체는 「묶음」에 붙이고, 청구·계산은 차수별 값을 더해 묶음 단위로 비교한다.
--
-- 직원 2026-10-02: 「묶음정산으로 처리, 청구는 제가 엑셀 기입값을 입력, 지급과 계산 부분만 남겨」
--   → 청구액(invoiced_amount_krw)은 차수별로 사람이 넣는다. 묶음 청구 = 그 합.
--     계산서 금액이 청구 합과 달라도 그 차이는 「청구-지급 차이」로 남긴다 (나중에 내역 확인).
--
-- 묶음 금액·잔액은 저장하지 않는다 — v_settlement_bundle_status 와 앱에서 매번 낸다.

-- SQL 에디터의 검색 경로가 public 을 빼고 있으면 「relation "transactions" does not exist」가 난다 (2026-10-02).
-- 경로를 고정하고, 그래도 없으면 다른 프로젝트에서 돌린 것이므로 아무것도 만들기 전에 멈춘다.
SET search_path = public;
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NULL THEN
    RAISE EXCEPTION 'public.transactions 가 없습니다 — 다른 Supabase 프로젝트에서 실행 중인지 확인하세요';
  END IF;
END $$;

-- ─────────────────────────────────────────
-- 1. 묶음과 그 차수
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_bundles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 최종정산만 받는다. 지급 현황의 중간정산은 상태·연체를 차수마다 내므로(lib/data/payments.ts)
  -- 중간정산 묶음을 넣으면 그 화면이 묶음 지급을 조용히 빠뜨린다. 필요해지면 그쪽을 먼저 고칠 것.
  kind       text        NOT NULL CHECK (kind = 'closing'),
  label      text        NOT NULL,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- 배분·차수가 (id, kind) 로 참조해 구분이 어긋나지 못하게 한다
  CONSTRAINT settlement_bundles_id_kind UNIQUE (id, kind)
);

COMMENT ON TABLE  settlement_bundles IS '계산서 한 장으로 여러 차수를 정산한 묶음. 금액은 저장하지 않는다.';
COMMENT ON COLUMN settlement_bundles.note IS '금액 차이 사유 — 정산 비교의 비고와 같은 뜻.';

CREATE TABLE IF NOT EXISTS settlement_bundle_rounds (
  bundle_id      uuid NOT NULL,
  kind           text NOT NULL,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  PRIMARY KEY (bundle_id, transaction_id),
  FOREIGN KEY (bundle_id, kind) REFERENCES settlement_bundles(id, kind) ON DELETE CASCADE,
  -- 한 차수의 같은 구분은 한 묶음에만 들어간다. 두 묶음에 걸치면 지급이 두 번 잡힌다.
  CONSTRAINT bundle_round_once UNIQUE (transaction_id, kind)
);

-- ─────────────────────────────────────────
-- 2. 배분이 차수 대신 묶음을 가리킬 수 있게
--    interim/closing/penalty(037) 는 차수나 묶음 중 **정확히 하나**를 가진다. 묶음 구분은 FK 가 closing 으로 묶는다.
-- ─────────────────────────────────────────
ALTER TABLE payment_allocations
  ADD COLUMN IF NOT EXISTS bundle_id uuid;

ALTER TABLE payment_allocations
  DROP CONSTRAINT IF EXISTS payment_allocations_bundle_fk;
ALTER TABLE payment_allocations
  ADD CONSTRAINT payment_allocations_bundle_fk
  FOREIGN KEY (bundle_id, kind) REFERENCES settlement_bundles(id, kind) ON DELETE RESTRICT;

ALTER TABLE payment_allocations DROP CONSTRAINT IF EXISTS alloc_round_required;
ALTER TABLE payment_allocations ADD CONSTRAINT alloc_round_required CHECK (
  (kind IN ('interim','closing','penalty') AND (transaction_id IS NOT NULL) <> (bundle_id IS NOT NULL))
  OR (kind IN ('warehouse','other') AND bundle_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_bundle
  ON payment_allocations(bundle_id) WHERE bundle_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_settlement_bundles_updated_at ON settlement_bundles;
CREATE TRIGGER trg_settlement_bundles_updated_at
  BEFORE UPDATE ON settlement_bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- 3. 묶음별 지급 — 화면이 읽는 창구
--    v_settlement_payment_status 는 transaction_id 가 있는 배분만 세므로 묶음 배분은 거기 섞이지 않는다.
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_settlement_bundle_status
WITH (security_invoker = true) AS
SELECT
  b.id    AS bundle_id,
  b.kind,
  b.label,
  b.note,
  COALESCE(
    (SELECT JSONB_AGG(m.transaction_id) FROM settlement_bundle_rounds m WHERE m.bundle_id = b.id),
    '[]'::jsonb
  )       AS transaction_ids,
  COALESCE(SUM(CASE WHEN p.direction = 'in' THEN -a.amount_krw ELSE a.amount_krw END), 0) AS paid_krw,
  COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'payment_id', a.payment_id,
        'paid_at',    p.paid_at,
        'amount',     CASE WHEN p.direction = 'in' THEN -a.amount_krw ELSE a.amount_krw END,
        'direction',  p.direction,
        'confirmed',  a.confirmed
      ) ORDER BY p.paid_at, a.amount_krw
    ) FILTER (WHERE a.id IS NOT NULL),
    '[]'::jsonb
  )       AS installments
FROM settlement_bundles b
LEFT JOIN payment_allocations a ON a.bundle_id = b.id
LEFT JOIN settlement_payments p ON p.id = a.payment_id
GROUP BY b.id, b.kind, b.label, b.note;

COMMENT ON VIEW v_settlement_bundle_status IS
  '묶음별 지급 합계와 회차. 청구·계산 합계와 차이는 애플리케이션에서 차수 값을 더해 낸다.';

-- ─────────────────────────────────────────
-- 4. RLS — 041 과 같은 규칙: 양사 읽기, 쓰기는 에이원만
-- ─────────────────────────────────────────
ALTER TABLE settlement_bundles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_bundle_rounds ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['settlement_bundles', 'settlement_bundle_rounds'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS all_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS a1_write ON public.%I', t);
    EXECUTE format($p$CREATE POLICY all_read ON public.%I FOR SELECT TO authenticated
                      USING (auth_role() IN ('a1_admin','a1_user','toei_user'))$p$, t);
    EXECUTE format($p$CREATE POLICY a1_write ON public.%I FOR ALL TO authenticated
                      USING (auth_role() IN ('a1_admin','a1_user'))
                      WITH CHECK (auth_role() IN ('a1_admin','a1_user'))$p$, t);
  END LOOP;
END $$;

-- 묶음 비고는 정산 비고와 같은 칸이라 토에이도 적는다 (메모는 양사 공용). 칸 제한은 040 의 트리거.
-- 이게 없으면 토에이의 저장이 RLS 에 걸려 0행 갱신으로 **오류 없이** 사라진다.
DROP POLICY IF EXISTS toei_note ON settlement_bundles;
CREATE POLICY toei_note ON settlement_bundles FOR UPDATE TO authenticated
  USING (auth_role() = 'toei_user')
  WITH CHECK (auth_role() = 'toei_user');

DROP TRIGGER IF EXISTS zz_guard_toei_columns ON settlement_bundles;
CREATE TRIGGER zz_guard_toei_columns BEFORE UPDATE ON settlement_bundles
  FOR EACH ROW EXECUTE FUNCTION guard_toei_columns('note', 'updated_at');

REVOKE ALL ON settlement_bundles, settlement_bundle_rounds, v_settlement_bundle_status FROM anon;
