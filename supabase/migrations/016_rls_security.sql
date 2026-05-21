-- 016_rls_security.sql
-- forwarding_quotes, forwarding_quote_items, audit_logs,
-- transaction_items, settlement_deadlines RLS 활성화 및 정책 추가

-- ─────────────────────────────────────────
-- forwarding_quotes
-- ─────────────────────────────────────────
alter table forwarding_quotes enable row level security;

create policy "a1 can manage forwarding_quotes"
  on forwarding_quotes for all
  using (auth_role() in ('a1_admin','a1_user'));

-- ─────────────────────────────────────────
-- forwarding_quote_items
-- ─────────────────────────────────────────
alter table forwarding_quote_items enable row level security;

create policy "a1 can manage forwarding_quote_items"
  on forwarding_quote_items for all
  using (auth_role() in ('a1_admin','a1_user'));

-- ─────────────────────────────────────────
-- audit_logs
-- a1_admin: SELECT만 허용
-- INSERT: service_role only (트리거 SECURITY DEFINER로 자동 우회)
-- ─────────────────────────────────────────
alter table audit_logs enable row level security;

create policy "a1_admin can read audit_logs"
  on audit_logs for select
  using (auth_role() = 'a1_admin');

create policy "service_role can insert audit_logs"
  on audit_logs for insert
  with check (auth.role() = 'service_role');

-- ─────────────────────────────────────────
-- transaction_items
-- ─────────────────────────────────────────
alter table transaction_items enable row level security;

create policy "a1 can manage transaction_items"
  on transaction_items for all
  using (auth_role() in ('a1_admin','a1_user'));

-- ─────────────────────────────────────────
-- settlement_deadlines
-- ─────────────────────────────────────────
alter table settlement_deadlines enable row level security;

create policy "a1 can manage settlement_deadlines"
  on settlement_deadlines for all
  using (auth_role() in ('a1_admin','a1_user'));
