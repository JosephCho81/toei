-- transaction_items: 거래별 품목(사양/단가/수량) 명세
create table transaction_items (
  id              uuid primary key default uuid_generate_v4(),
  transaction_id  uuid not null references transactions(id) on delete cascade,
  spec            text,
  glove_type      text,
  color           text,
  size            text,
  unit_price_usd  numeric(15,4),
  quantity        integer,
  unit            text default 'DZ',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_transaction_items_updated_at
  before update on transaction_items
  for each row execute function update_updated_at();

-- settlement_deadlines: 정산/LC 마감일 알림
create table settlement_deadlines (
  id              uuid primary key default uuid_generate_v4(),
  transaction_id  uuid not null references transactions(id) on delete cascade,
  deadline_type   text not null default 'lc_payment'
                  check (deadline_type in ('lc_payment','interim','closing','custom')),
  due_date        date not null,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_settlement_deadlines_due_date on settlement_deadlines(due_date);
