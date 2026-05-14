-- 002_policies_views_triggers.sql
-- RLS 정책, 뷰, 잠금 트리거

-- ─────────────────────────────────────────
-- RLS 활성화
-- ─────────────────────────────────────────
alter table manufacturers          enable row level security;
alter table carrier_prefixes       enable row level security;
alter table transactions           enable row level security;
alter table containers             enable row level security;
alter table interim_settlements    enable row level security;
alter table interim_cost_items     enable row level security;
alter table closing_settlements    enable row level security;
alter table lc_fee_items           enable row level security;
alter table closing_cost_items     enable row level security;
alter table exchange_rate_cache    enable row level security;

-- ─────────────────────────────────────────
-- 역할 정의
-- ─────────────────────────────────────────
-- auth.jwt() ->> 'role' 로 판별
-- 'a1_admin'  : 한국에이원 관리자 (전체 접근)
-- 'a1_user'   : 한국에이원 일반 (조회 + 저장, 잠금 불가)
-- 'toei_user' : 토에이산교 (제한된 뷰만)

-- helper function
create or replace function auth_role() returns text language sql security definer as $$
  select coalesce(auth.jwt() ->> 'user_metadata', '{}')::jsonb ->> 'role';
$$;

-- ─────────────────────────────────────────
-- manufacturers 정책
-- ─────────────────────────────────────────
create policy "a1 can read manufacturers"
  on manufacturers for select
  using (auth_role() in ('a1_admin','a1_user','toei_user'));

create policy "a1_admin can manage manufacturers"
  on manufacturers for all
  using (auth_role() = 'a1_admin');

-- ─────────────────────────────────────────
-- carrier_prefixes 정책
-- ─────────────────────────────────────────
create policy "everyone can read carrier_prefixes"
  on carrier_prefixes for select
  using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- transactions 정책
-- ─────────────────────────────────────────
create policy "a1 can read all transactions"
  on transactions for select
  using (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can insert transactions"
  on transactions for insert
  with check (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can update unlocked transactions"
  on transactions for update
  using (auth_role() in ('a1_admin','a1_user') and is_locked = false);

create policy "a1_admin can update locked transactions"
  on transactions for update
  using (auth_role() = 'a1_admin');

-- toei: 제한된 조회 (원가 노출 금지 - 뷰 통해서만)
create policy "toei can read via view only"
  on transactions for select
  using (auth_role() = 'toei_user' and false);  -- 직접 테이블 접근 차단

-- ─────────────────────────────────────────
-- containers 정책
-- ─────────────────────────────────────────
create policy "a1 can manage containers"
  on containers for all
  using (auth_role() in ('a1_admin','a1_user'));

create policy "toei can read containers"
  on containers for select
  using (auth_role() = 'toei_user');

-- ─────────────────────────────────────────
-- interim_settlements 정책
-- ─────────────────────────────────────────
create policy "a1 can read interim"
  on interim_settlements for select
  using (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can insert interim"
  on interim_settlements for insert
  with check (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can update unlocked interim"
  on interim_settlements for update
  using (auth_role() in ('a1_admin','a1_user') and is_locked = false);

create policy "a1_admin can update locked interim"
  on interim_settlements for update
  using (auth_role() = 'a1_admin');

-- ─────────────────────────────────────────
-- interim_cost_items 정책
-- ─────────────────────────────────────────
create policy "a1 can manage interim_cost_items"
  on interim_cost_items for all
  using (auth_role() in ('a1_admin','a1_user'));

-- ─────────────────────────────────────────
-- closing_settlements 정책
-- ─────────────────────────────────────────
create policy "a1 can read closing"
  on closing_settlements for select
  using (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can insert closing"
  on closing_settlements for insert
  with check (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can update unlocked closing"
  on closing_settlements for update
  using (auth_role() in ('a1_admin','a1_user') and is_locked = false);

create policy "a1_admin can update locked closing"
  on closing_settlements for update
  using (auth_role() = 'a1_admin');

-- lc_fee_items, closing_cost_items
create policy "a1 can manage lc_fee_items"
  on lc_fee_items for all
  using (auth_role() in ('a1_admin','a1_user'));

create policy "a1 can manage closing_cost_items"
  on closing_cost_items for all
  using (auth_role() in ('a1_admin','a1_user'));

-- exchange_rate_cache
create policy "authenticated can read exchange rates"
  on exchange_rate_cache for select
  using (auth.role() = 'authenticated');

create policy "a1 can manage exchange rates"
  on exchange_rate_cache for all
  using (auth_role() in ('a1_admin','a1_user'));

-- ─────────────────────────────────────────
-- 토에이 전용 뷰 (원가 노출 금지)
-- ─────────────────────────────────────────
create or replace view toei_transaction_view
with (security_invoker = true)
as
select
  t.id,
  t.round_label,
  t.order_no,
  m.name as manufacturer_name,
  t.lc_no,
  t.lc_open_date,
  t.customs_date,
  t.settlement_status,
  t.is_locked,
  -- 확정된 정산액만 노출 (미확정 시 NULL)
  case when t.settlement_status in ('interim_done','closing_done','closing_saved')
    then i.confirmed_amount_krw
    else null
  end as interim_confirmed_krw,
  case when t.settlement_status in ('closing_done')
    then c.confirmed_amount_krw
    else null
  end as closing_confirmed_krw,
  i.is_paid as interim_is_paid,
  c.is_paid as closing_is_paid
from transactions t
left join manufacturers m on m.id = t.manufacturer_id
left join interim_settlements i on i.transaction_id = t.id
left join closing_settlements c on c.transaction_id = t.id;

-- ─────────────────────────────────────────
-- 잠금 시 자동 타임스탬프 트리거
-- ─────────────────────────────────────────
create or replace function set_locked_at()
returns trigger language plpgsql as $$
begin
  if new.is_locked = true and (old.is_locked is false or old.is_locked is null) then
    new.locked_at = now();
  end if;
  return new;
end;
$$;

create trigger trg_interim_locked_at
  before update on interim_settlements
  for each row execute function set_locked_at();

create trigger trg_closing_locked_at
  before update on closing_settlements
  for each row execute function set_locked_at();

-- ─────────────────────────────────────────
-- 정산 잠금 시 transaction status 자동 업데이트
-- ─────────────────────────────────────────
create or replace function sync_transaction_status()
returns trigger language plpgsql security definer as $$
begin
  if TG_TABLE_NAME = 'interim_settlements' then
    if new.is_locked = true then
      update transactions set settlement_status = 'interim_done'
      where id = new.transaction_id;
    elsif new.confirmed_amount_krw is not null then
      update transactions set settlement_status = 'interim_saved'
      where id = new.transaction_id;
    end if;
  elsif TG_TABLE_NAME = 'closing_settlements' then
    if new.is_locked = true then
      update transactions set settlement_status = 'closing_done', is_locked = true
      where id = new.transaction_id;
    elsif new.confirmed_amount_krw is not null then
      update transactions set settlement_status = 'closing_saved'
      where id = new.transaction_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_sync_status_from_interim
  after update on interim_settlements
  for each row execute function sync_transaction_status();

create trigger trg_sync_status_from_closing
  after update on closing_settlements
  for each row execute function sync_transaction_status();
