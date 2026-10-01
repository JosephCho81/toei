-- 041_enable_rls.sql
-- 모든 표에 RLS 를 켜고 anon(로그인 안 한 사람)의 접근을 걷는다. 2026-10-01.
--
-- ⚠️ 로그인 복구 코드가 배포된 **뒤에** 실행한다. 지금까지 앱은 anon 키로 읽고 썼으므로
--    로그인 없이 이 파일을 돌리면 화면이 전부 비고 저장이 전부 실패한다.
--
-- 지금까지는 공개 키(브라우저에 실려 나가는 키)만 있으면 누구나 모든 표를 고칠 수 있었다.
-- 토에이 계정을 화면에서만 읽기 전용으로 만들면 의미가 없어서 DB 에서 막는다.
--
-- 권한
--   a1_admin · a1_user : 전 표 읽기·쓰기
--   toei_user          : 전 표 읽기 (감사 로그 제외)
--                        + transactions · interim_settlements · closing_settlements 의 메모 칸 수정
--                          (칸 제한은 040 의 guard_toei_columns 트리거)
--                        + transaction_flags(오류 체크·메모) 추가·수정·삭제
--   anon               : 없음
--
-- 라이브 DB 가 마이그레이션 파일과 어긋나 있어(002·016 정책 일부만 적용) 표 이름을 적지 않고
-- public 스키마의 표 전부를 돈다. 기존 정책은 지우고 다시 만든다 — permissive 정책은 OR 로 합쳐지므로
-- 옛 정책 하나(예: 「authenticated 면 허용」)가 남아 있으면 토에이 제한이 통째로 무력해진다.

DO $$
DECLARE
  t   text;
  pol record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    IF t = 'audit_logs' THEN
      -- 쓰기는 감사 트리거(SECURITY DEFINER)만 한다
      EXECUTE format($p$CREATE POLICY a1_read ON public.%I FOR SELECT TO authenticated
                        USING (auth_role() IN ('a1_admin','a1_user'))$p$, t);
      CONTINUE;
    END IF;

    EXECUTE format($p$CREATE POLICY all_read ON public.%I FOR SELECT TO authenticated
                      USING (auth_role() IN ('a1_admin','a1_user','toei_user'))$p$, t);
    EXECUTE format($p$CREATE POLICY a1_write ON public.%I FOR ALL TO authenticated
                      USING (auth_role() IN ('a1_admin','a1_user'))
                      WITH CHECK (auth_role() IN ('a1_admin','a1_user'))$p$, t);

    IF t IN ('transactions', 'interim_settlements', 'closing_settlements') THEN
      EXECUTE format($p$CREATE POLICY toei_note ON public.%I FOR UPDATE TO authenticated
                        USING (auth_role() = 'toei_user')
                        WITH CHECK (auth_role() = 'toei_user')$p$, t);
    ELSIF t = 'transaction_flags' THEN
      EXECUTE format($p$CREATE POLICY toei_flags ON public.%I FOR ALL TO authenticated
                        USING (auth_role() = 'toei_user')
                        WITH CHECK (auth_role() = 'toei_user')$p$, t);
    END IF;
  END LOOP;
END $$;

-- 뷰는 기본이 소유자 권한이라 표의 RLS 를 건너뛴다 — 호출자 권한으로 읽게 바꾼다.
DO $$
DECLARE v text;
BEGIN
  FOR v IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- 저장 RPC 둘은 anon 으로 돌던 시절 RLS 를 넘으려고 SECURITY DEFINER 였다(026·028·036).
-- 그대로 두면 토에이 계정이 이 함수로 비용 항목을 고칠 수 있다 — 호출자 권한으로 돌려 RLS 를 받게 한다.
-- 잠금 검사는 함수 안에 그대로 있다.
ALTER FUNCTION save_closing_items(uuid, jsonb, jsonb) SECURITY INVOKER;
ALTER FUNCTION save_interim_cost_items(uuid, jsonb) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION save_closing_items(uuid, jsonb, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION save_interim_cost_items(uuid, jsonb) FROM anon, public;

-- 확인: RLS 가 꺼진 표가 남았는가 (0행이어야 한다)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
