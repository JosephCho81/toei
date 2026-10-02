-- 043_note_meta.sql
-- 메모를 누가·언제 마지막으로 저장했는지 남긴다. 2026-10-02.
--
-- 메모는 양사가 같은 칸을 같이 쓴다(041). 글 안에 「[토에이 10-02]」를 붙이면 칸이 길어져서
-- (사용자 2026-10-02: 「지금도 글 숫자가 너무 많은 거 같은데」) 메모와 따로 저장하고 펼쳤을 때만 보인다.
--
-- 앱이 아니라 트리거가 찍는다 — 화면 하나가 빠뜨려도 기록은 남고, 토에이가 값을 꾸며 보낼 수도 없다.
-- 남는 것은 칸마다 **마지막 저장**뿐이다. 이전 글은 남지 않는다.
--
--   note_meta = { "<칸 이름>": { "by": "<auth_role()>", "at": "<timestamptz>" }, ... }

SET search_path = public;
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NULL THEN
    RAISE EXCEPTION 'public.transactions 가 없습니다 — 다른 Supabase 프로젝트에서 실행 중인지 확인하세요';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION stamp_note_meta() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  col  text;
  meta jsonb;
  newv jsonb := to_jsonb(NEW);
  oldv jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
BEGIN
  -- 사람이 보낸 note_meta 는 받지 않는다 — 언제나 옛 값에서 시작한다
  IF TG_OP = 'UPDATE' THEN
    meta := COALESCE(OLD.note_meta, '{}'::jsonb);
  ELSE
    meta := '{}'::jsonb;
  END IF;

  FOREACH col IN ARRAY TG_ARGV LOOP
    CONTINUE WHEN (newv -> col) IS NOT DISTINCT FROM (oldv -> col);
    IF COALESCE(newv ->> col, '') = '' THEN
      meta := meta - col;
    ELSE
      meta := jsonb_set(meta, ARRAY[col],
        jsonb_build_object('by', NULLIF(auth_role(), ''), 'at', now()));
    END IF;
  END LOOP;

  NEW := jsonb_populate_record(NEW, jsonb_build_object('note_meta', meta));
  RETURN NEW;
END;
$$;

-- 트리거 이름을 zzz_ 로 둔다. BEFORE 트리거는 이름 순으로 돌아서 040 의 zz_guard_toei_columns 가
-- 먼저 검사한다 — 그 검사가 끝난 뒤에 찍어야 토에이의 메모 저장이 「메모 외 칸 변경」으로 막히지 않는다.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('transactions',         ARRAY['notes', 'payment_note']),
      ('interim_settlements',  ARRAY['notes', 'calc_diff_note']),
      ('closing_settlements',  ARRAY['notes', 'calc_diff_note']),
      ('settlement_penalties', ARRAY['note']),
      ('settlement_bundles',   ARRAY['note'])
    ) AS v(tbl, cols)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS note_meta jsonb NOT NULL DEFAULT %L::jsonb',
                   spec.tbl, '{}');
    EXECUTE format('DROP TRIGGER IF EXISTS zzz_stamp_note_meta ON public.%I', spec.tbl);
    EXECUTE format('CREATE TRIGGER zzz_stamp_note_meta BEFORE INSERT OR UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION stamp_note_meta(%s)',
                   spec.tbl,
                   (SELECT string_agg(quote_literal(c), ', ') FROM unnest(spec.cols) AS c));
  END LOOP;
END $$;

-- 묶음 비고의 작성 정보도 화면이 뷰에서 읽는다 (042 뷰 끝에 칸 하나 더)
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
  )       AS installments,
  b.note_meta
FROM settlement_bundles b
LEFT JOIN payment_allocations a ON a.bundle_id = b.id
LEFT JOIN settlement_payments p ON p.id = a.payment_id
GROUP BY b.id, b.kind, b.label, b.note, b.note_meta;
