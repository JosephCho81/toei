-- 040_accounts_roles.sql
-- 계정 둘과 역할 판별. 2026-10-01 직원 요청 — 토에이 계정은 읽기 위주.
--
--   alkorea (한국에이원) : a1_admin  — 입력·계산
--   toei    (토에이)     : toei_user — 읽기 + 메모만 (오류 체크·거래 메모·정산 비고·지급 비고)
--
-- 이 파일은 **기존 동작을 깨지 않는다** (RLS 는 아직 끄인 그대로). 041 이 RLS 를 켠다.
-- 실행 순서: 040 → 로그인 복구 코드 배포 → 041.
--
-- ID 로그인: 화면은 ID 만 받고 `<id>@toei.local` 로 바꿔 Supabase Auth 에 넘긴다 (lib/auth/role.ts).
-- 계정 생성(비밀번호)은 저장소 밖에서 한다.

-- ─────────────────────────────────────────
-- 1. 역할은 app_metadata 에서 읽는다
-- user_metadata 는 본인이 supabase.auth.updateUser({ data }) 로 고칠 수 있다 —
-- 거기서 역할을 읽으면 토에이 계정이 스스로 a1_admin 이 될 수 있다.
-- app_metadata 는 서버(관리자)만 쓴다.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION auth_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- ─────────────────────────────────────────
-- 2. 계정 — 비밀번호를 저장소에 남기지 않으려고 이 파일에서는 만들지 않는다.
-- 계정을 만든 뒤 역할만 여기서 맞춘다 (이미 있으면 역할만 갱신).
-- ─────────────────────────────────────────
UPDATE auth.users
   SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role',
                                CASE email WHEN 'alkorea@toei.local' THEN 'a1_admin' ELSE 'toei_user' END)
 WHERE email IN ('alkorea@toei.local', 'toei@toei.local');

-- ─────────────────────────────────────────
-- 3. 토에이 계정은 메모 칸만 고친다
-- RLS 는 행 단위라 「이 칸만」을 말하지 못한다. 그래서 UPDATE 를 허용한 표마다
-- 허용 칸을 뺀 나머지가 바뀌었으면 막는다. updated_at 은 다른 트리거가 채우므로 허용한다.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION guard_toei_columns() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF auth_role() = 'toei_user'
     AND (to_jsonb(NEW) - TG_ARGV::text[]) IS DISTINCT FROM (to_jsonb(OLD) - TG_ARGV::text[]) THEN
    RAISE EXCEPTION '토에이 계정은 메모만 수정할 수 있습니다'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_guard_toei_columns ON transactions;
CREATE TRIGGER zz_guard_toei_columns BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION guard_toei_columns('notes', 'payment_note', 'updated_at');

DROP TRIGGER IF EXISTS zz_guard_toei_columns ON interim_settlements;
CREATE TRIGGER zz_guard_toei_columns BEFORE UPDATE ON interim_settlements
  FOR EACH ROW EXECUTE FUNCTION guard_toei_columns('notes', 'calc_diff_note', 'updated_at');

DROP TRIGGER IF EXISTS zz_guard_toei_columns ON closing_settlements;
CREATE TRIGGER zz_guard_toei_columns BEFORE UPDATE ON closing_settlements
  FOR EACH ROW EXECUTE FUNCTION guard_toei_columns('notes', 'calc_diff_note', 'updated_at');

-- 확인: 두 계정과 역할
SELECT email, raw_app_meta_data ->> 'role' AS role, email_confirmed_at IS NOT NULL AS confirmed
  FROM auth.users WHERE email IN ('alkorea@toei.local', 'toei@toei.local');
