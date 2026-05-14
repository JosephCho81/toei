-- 001_initial_schema.sql
-- 토에이산교↔한국에이원 수입 정산 관리 시스템

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. 제조사 (manufacturers)
-- ─────────────────────────────────────────
create table manufacturers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  name_aliases text[] default '{}',  -- 별칭 목록 (정규화용)
  country     text not null default 'JP',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 2. 선사 컨테이너 prefix (carrier_prefixes)
-- ─────────────────────────────────────────
create table carrier_prefixes (
  id          uuid primary key default uuid_generate_v4(),
  prefix      char(4) not null unique,  -- e.g. 'MRKU', 'HLXU'
  carrier     text not null,
  api_type    text not null check (api_type in ('maersk_official','hapag_official','manual')),
  tracking_url text
);

-- 기본 선사 데이터
insert into carrier_prefixes (prefix, carrier, api_type, tracking_url) values
  ('MRKU', 'Maersk', 'maersk_official', 'https://www.maersk.com/tracking/'),
  ('MSKU', 'Maersk', 'maersk_official', 'https://www.maersk.com/tracking/'),
  ('MAEU', 'Maersk', 'maersk_official', 'https://www.maersk.com/tracking/'),
  ('HLXU', 'Hapag-Lloyd', 'hapag_official', 'https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-container.html'),
  ('HLCU', 'Hapag-Lloyd', 'hapag_official', 'https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-container.html'),
  ('HDMU', 'Hyundai Merchant Marine', 'manual', 'https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do'),
  ('SMLU', 'SM Line', 'manual', 'https://www.smlines.com/'),
  ('KMTU', 'Korea Marine Transport', 'manual', 'https://www.kmtc.co.kr/'),
  ('OOLU', 'OOCL', 'manual', 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx'),
  ('COSU', 'COSCO', 'manual', 'https://elines.coscoshipping.com/ebusiness/cargoTracking'),
  ('MSCU', 'MSC', 'manual', 'https://www.msc.com/track-a-shipment'),
  ('CMAU', 'CMA CGM', 'manual', 'https://www.cma-cgm.com/ebusiness/tracking'),
  ('EVGU', 'Evergreen', 'manual', 'https://www.evergreen-line.com/eservice/public/ebtracking.do'),
  ('YMLU', 'Yang Ming', 'manual', 'https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx');

-- ─────────────────────────────────────────
-- 3. 거래 (transactions) - 차수별 수입 건
-- ─────────────────────────────────────────
create table transactions (
  id                  uuid primary key default uuid_generate_v4(),
  round_no            integer not null unique,   -- 내부 차수번호 (1~)
  round_label         text not null,             -- 표시용 라벨 (예: '26년 40차')
  order_no            text,                      -- 발주번호 (예: TOSK06/26)
  manufacturer_id     uuid references manufacturers(id),
  import_amount_usd   numeric(15,4),             -- 수입금액 USD
  lc_no               text,                      -- LC 번호
  lc_open_date        date,                      -- LC 개설일
  customs_date        date,                      -- 통관일
  customs_exchange_rate numeric(10,4),           -- 통관환율 (원/달러)
  margin_rate_pct     numeric(6,4),              -- 마진율 (%)
  settlement_status   text not null default 'pending'
                      check (settlement_status in (
                        'pending','interim_saved','interim_done',
                        'closing_saved','closing_done'
                      )),
  is_locked           boolean not null default false,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 4. 컨테이너 (containers)
-- ─────────────────────────────────────────
create table containers (
  id                  uuid primary key default uuid_generate_v4(),
  transaction_id      uuid not null references transactions(id) on delete cascade,
  container_no        text not null,
  seal_no             text,
  carrier             text,
  api_type            text check (api_type in ('maersk_official','hapag_official','manual')),
  etd                 date,
  eta                 date,
  actual_arrival      date,
  vessel_name         text,
  voyage_no           text,
  current_location    text,
  tracking_status     text,
  last_tracked_at     timestamptz,
  manual_notes        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 5. 중간정산 (interim_settlements)
-- ─────────────────────────────────────────
create table interim_settlements (
  id                  uuid primary key default uuid_generate_v4(),
  transaction_id      uuid not null unique references transactions(id) on delete cascade,
  customs_exchange_rate numeric(10,4) not null,
  rounding_policy     text not null default 'floor_100'
                      check (rounding_policy in ('floor_100','floor_10','none')),
  system_amount_krw   numeric(15,0),   -- 시스템 계산값
  confirmed_amount_krw numeric(15,0),  -- 확정 금액 (수동 수정 가능)
  is_paid             boolean not null default false,
  paid_date           date,
  is_locked           boolean not null default false,
  locked_at           timestamptz,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 6. 중간정산 비용 항목 (interim_cost_items)
-- ─────────────────────────────────────────
create table interim_cost_items (
  id                  uuid primary key default uuid_generate_v4(),
  interim_settlement_id uuid not null references interim_settlements(id) on delete cascade,
  item_name           text not null,
  amount_krw          numeric(15,0) not null default 0,
  is_vat_taxable      boolean not null default false,
  vat_amount_krw      numeric(15,0) not null default 0,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 7. 클로징정산 (closing_settlements)
-- ─────────────────────────────────────────
create table closing_settlements (
  id                    uuid primary key default uuid_generate_v4(),
  transaction_id        uuid not null unique references transactions(id) on delete cascade,
  closing_date          date not null,
  bok_exchange_rate     numeric(10,4),    -- 한국은행 고시 환율
  lc_payment_total_krw  numeric(15,0),   -- LC 결제비용 (토에이 은행 지불)
  fx_burden_a1_pct      numeric(5,2) not null default 50.00,  -- 환차손익 에이원 부담 비율
  rounding_policy       text not null default 'floor_100'
                        check (rounding_policy in ('floor_100','floor_10','none')),
  system_amount_krw     numeric(15,0),   -- 시스템 계산값
  confirmed_amount_krw  numeric(15,0),   -- 확정 금액
  is_paid               boolean not null default false,
  paid_date             date,
  is_locked             boolean not null default false,
  locked_at             timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 8. LC 수수료 항목 (lc_fee_items)
-- ─────────────────────────────────────────
create table lc_fee_items (
  id                    uuid primary key default uuid_generate_v4(),
  closing_settlement_id uuid not null references closing_settlements(id) on delete cascade,
  item_name             text not null,
  amount_krw            numeric(15,0) not null default 0,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 9. 클로징 추가비용 항목 (closing_cost_items)
-- ─────────────────────────────────────────
create table closing_cost_items (
  id                    uuid primary key default uuid_generate_v4(),
  closing_settlement_id uuid not null references closing_settlements(id) on delete cascade,
  item_name             text not null,
  amount_krw            numeric(15,0) not null default 0,
  includes_vat          boolean not null default false,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- 10. 환율 캐시 (exchange_rate_cache)
-- ─────────────────────────────────────────
create table exchange_rate_cache (
  date        date primary key,
  rate_krw    numeric(10,4) not null,
  source      text not null default 'bok_ecos',
  fetched_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- updated_at 자동 갱신 함수
-- ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

create trigger trg_containers_updated_at
  before update on containers
  for each row execute function update_updated_at();

create trigger trg_interim_settlements_updated_at
  before update on interim_settlements
  for each row execute function update_updated_at();

create trigger trg_closing_settlements_updated_at
  before update on closing_settlements
  for each row execute function update_updated_at();
