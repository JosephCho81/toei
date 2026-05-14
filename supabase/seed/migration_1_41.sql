-- migration_1_41.sql
-- 1차~41차 수입 정산 데이터 마이그레이션
-- Excel: 2026_수입일람정리_최종정산내역 정리_수정6.xlsx
-- 날짜 변환: date(1899-12-30) + timedelta(days=serial)

BEGIN;

-- ─────────────────────────────────────────
-- 1. 제조사
-- ─────────────────────────────────────────
INSERT INTO manufacturers (name, name_aliases, country) VALUES
  ('쫑홍풀린', ARRAY['쫑홍풀린','쫑홍푸린'], 'China'),
  ('하텔레가', ARRAY['하텔레가','하르텔레가','하텔레 가'], 'Malaysia'),
  ('STGT',    ARRAY['STGT'],                 'Malaysia')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────
-- 2. 거래 (transactions) 1~41차
-- ─────────────────────────────────────────

-- 1차 (쫑홍풀린, serial 44445 = 2021-09-05)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (1, '1차', '쫑홍풀린1차', (SELECT id FROM manufacturers WHERE name='쫑홍풀린'), 60800.0000, '2021-09-05', 1205.4800, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 2차 (하텔레가, serial 44561 = 2021-12-31)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (2, '2차', 'TOSK01/21', (SELECT id FROM manufacturers WHERE name='하텔레가'), 89424.0000, '2021-12-31', 1209.6700, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 3차 (하텔레가, serial 44589 = 2022-01-28)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (3, '3차', 'TOSK02/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 80784.0000, '2022-01-28', 1227.4000, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 4차 (하텔레가, serial 44627 = 2022-03-07)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (4, '4차', 'TOSK03/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 76176.0000, '2022-03-07', 1246.1800, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 5차 (하텔레가, serial 44634 = 2022-03-14)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (5, '5차', 'TOSK04/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 74880.0000, '2022-03-14', 1290.0900, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 6차 (하텔레가, serial 44669 = 2022-04-18)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (6, '6차', 'TOSK05/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 77530.5000, '2022-04-18', 1328.1300, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 7차 (하텔레가, serial 44705 = 2022-05-24)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (7, '7차', 'TOSK06/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 79200.0000, '2022-05-24', 1328.1300, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 8차 (하텔레가, serial 44733 = 2022-06-21)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (8, '8차', 'TOSK07/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 75829.5000, '2022-06-21', 1316.7600, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 9차 (하텔레가, serial 44771 = 2022-07-29)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (9, '9차', 'TOSK08/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 73440.0000, '2022-07-29', 1421.6500, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 10차 (하텔레가, serial 44862 = 2022-10-27)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (10, '10차', 'TOSK09/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 55584.0000, '2022-10-27', 1303.6000, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 11차 (하텔레가, serial 44862 = 2022-10-27)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (11, '11차', 'TOSK10/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 55584.0000, '2022-10-27', 1294.5600, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 12차 (하텔레가, serial 44862 = 2022-10-27)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (12, '12차', 'TOSK11/22', (SELECT id FROM manufacturers WHERE name='하텔레가'), 59500.8000, '2022-10-27', 1303.6000, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 13차 (하텔레가, serial 44984 = 2023-02-26)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (13, '13차', 'TOSK01/23', (SELECT id FROM manufacturers WHERE name='하텔레가'), 57024.0000, '2023-02-26', 1298.1000, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 14차 (하텔레가, serial 44984 = 2023-02-26)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (14, '14차', 'TOSK02/23', (SELECT id FROM manufacturers WHERE name='하텔레가'), 59796.0000, '2023-02-26', 1310.5200, 7.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 15차 (하텔레가, serial 45079 = 2023-06-01, margin 5%)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (15, '15차', 'TOSK03/23', (SELECT id FROM manufacturers WHERE name='하텔레가'), 38375.0000, '2023-06-01', 1307.1400, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 16차 (하텔레가, serial 45140 = 2023-08-01)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (16, '16차', 'TOSK04/23', (SELECT id FROM manufacturers WHERE name='하텔레가'), 60624.0000, '2023-08-01', 1329.1600, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 17차 (하텔레가, serial 45194 = 2023-09-24)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (17, '17차', 'TOSK05/23', (SELECT id FROM manufacturers WHERE name='하텔레가'), 59904.0000, '2023-09-24', 1293.7800, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 18차 (하텔레가, serial 45341 = 2024-02-18)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (18, '18차', 'TOSK01/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 62208.0000, '2024-02-18', 1315.6600, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 19차 (하텔레가, serial 45341 = 2024-02-18)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (19, '19차', 'TOSK02/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 62208.0000, '2024-02-18', 1315.6600, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 20차 (STGT, serial 45344 = 2024-02-21)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (20, '20차', 'STGT24/01', (SELECT id FROM manufacturers WHERE name='STGT'), 33462.0000, '2024-02-21', 1364.1000, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 21차 (하텔레가, serial 45406 = 2024-04-23)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (21, '21차', 'TOSK03/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 35707.7000, '2024-04-23', 1374.2000, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 22차 (하텔레가, serial 45547 = 2024-09-11)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (22, '22차', 'TOSK04/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 36230.5500, '2024-09-11', 1358.8200, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 23차 (하텔레가, serial 45681 = 2025-01-23)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (23, '23차', 'TOSK05/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 83865.0000, '2025-01-23', 1467.1000, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 24차 (하텔레가, serial 45665 = 2025-01-07)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (24, '24차', 'TOSK06/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 83625.0000, '2025-01-07', 1451.4800, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 25차 (하텔레가, serial 45730 = 2025-03-13)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (25, '25차', 'TOSK07/24', (SELECT id FROM manufacturers WHERE name='하텔레가'), 36520.0000, '2025-03-13', 1429.7600, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 26차 (하텔레가, serial 45713 = 2025-02-24)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (26, '26차', 'TOSK01/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 38280.0000, '2025-02-24', 1451.9200, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 27차 (하텔레가, serial 45710 = 2025-02-21)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (27, '27차', 'TOSK02/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 36432.0000, '2025-02-21', 1451.9200, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 28차 (하텔레가, serial 45730 = 2025-03-13)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (28, '28차', 'TOSK03/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 80010.0000, '2025-03-13', 1429.7600, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 29차 (하텔레가, serial 45777 = 2025-04-29)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (29, '29차', 'TOSK04/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 35888.4000, '2025-04-29', 1358.8200, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 30차 (하텔레가, serial 45838 = 2025-06-29)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (30, '30차', 'TOSK05/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 66069.0000, '2025-06-29', 1385.0200, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 31차 (하텔레가, serial 45838 = 2025-06-29)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (31, '31차', 'TOSK06/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 35199.2000, '2025-06-29', 1390.5000, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 32차 (하텔레가, serial 45848 = 2025-07-09)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (32, '32차', 'TOSK07/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 72866.2500, '2025-07-09', 1385.0200, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 33차 (하텔레가, serial 45982 = 2025-11-20) — closing_done+locked, no closing settlement data in Excel
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (33, '33차', 'TOSK08/25', (SELECT id FROM manufacturers WHERE name='하텔레가'), 81675.0000, '2025-11-20', 1467.9600, 5.00, 'closing_done', true)
ON CONFLICT (round_no) DO NOTHING;

-- 34차 (쫑홍풀린, serial 46017 = 2025-12-25) — closing_done, not locked
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (34, '34차', 'TKZH01/26', (SELECT id FROM manufacturers WHERE name='쫑홍풀린'), 56520.0000, '2025-12-25', 1439.2600, 5.00, 'closing_done', false)
ON CONFLICT (round_no) DO NOTHING;

-- 35차 (하텔레가, serial 46066 = 2026-02-12)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (35, '35차', 'TOSK01/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 80497.0000, '2026-02-12', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- 36차 (하텔레가, serial 46106 = 2026-03-24)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (36, '36차', 'TOSK02/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 65370.0000, '2026-03-24', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- 37차 (하텔레가, serial 46115 = 2026-04-02)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (37, '37차', 'TOSK03/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 119412.0000, '2026-04-02', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- 38차 (하텔레가, serial 46139 = 2026-04-26)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (38, '38차', 'TOSK04/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 79735.0000, '2026-04-26', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- 39차 (하텔레가, serial 46148 = 2026-05-05, TOSK05/26 → round_no 39)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (39, '39차', 'TOSK05/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 79735.0000, '2026-05-05', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- 40차 (하텔레가, serial 46172 = 2026-05-29, TOSK06/26 → round_no 40)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (40, '40차', 'TOSK06/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 129600.0000, '2026-05-29', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- 41차 (하텔레가, serial 46185 = 2026-06-11, TOSK07/26 → round_no 41)
INSERT INTO transactions (round_no, round_label, order_no, manufacturer_id, import_amount_usd, lc_open_date, customs_exchange_rate, margin_rate_pct, settlement_status, is_locked)
VALUES (41, '41차', 'TOSK07/26', (SELECT id FROM manufacturers WHERE name='하텔레가'), 129600.0000, '2026-06-11', NULL, 5.00, 'pending', false)
ON CONFLICT (round_no) DO NOTHING;

-- ─────────────────────────────────────────
-- 3. 중간정산 (interim_settlements) 1~34차
-- ─────────────────────────────────────────

INSERT INTO interim_settlements (transaction_id, customs_exchange_rate, rounding_policy, confirmed_amount_krw, is_paid, is_locked)
VALUES
  ((SELECT id FROM transactions WHERE round_no=1),  1205.4800, 'none',      83844300, true, true),
  ((SELECT id FROM transactions WHERE round_no=2),  1209.6700, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=3),  1227.4000, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=4),  1246.1800, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=5),  1290.0900, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=6),  1328.1300, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=7),  1328.1300, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=8),  1316.7600, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=9),  1421.6500, 'none',      NULL,     true, true),
  ((SELECT id FROM transactions WHERE round_no=10), 1303.6000, 'none',      88290987, true, true),
  ((SELECT id FROM transactions WHERE round_no=11), 1294.5600, 'none',      87708402, true, true),
  ((SELECT id FROM transactions WHERE round_no=12), 1303.6000, 'none',      94663679, true, true),
  ((SELECT id FROM transactions WHERE round_no=13), 1298.1000, 'none',      89765056, true, true),
  ((SELECT id FROM transactions WHERE round_no=14), 1310.5200, 'none',      94617875, true, true),
  ((SELECT id FROM transactions WHERE round_no=15), 1307.1400, 'none',      58989873, true, true),
  ((SELECT id FROM transactions WHERE round_no=16), 1329.1600, 'floor_100', 95030000, true, true),
  ((SELECT id FROM transactions WHERE round_no=17), 1293.7800, 'floor_10',  92945160, true, true),
  ((SELECT id FROM transactions WHERE round_no=18), 1315.6600, 'floor_100', 96338000, true, true),
  ((SELECT id FROM transactions WHERE round_no=19), 1315.6600, 'floor_100', 96632900, true, true),
  ((SELECT id FROM transactions WHERE round_no=20), 1364.1000, 'floor_100', 55609200, true, true),
  ((SELECT id FROM transactions WHERE round_no=21), 1374.2000, 'floor_100', 58174000, true, true),
  ((SELECT id FROM transactions WHERE round_no=22), 1358.8200, 'floor_100', 58491300, true, true),
  ((SELECT id FROM transactions WHERE round_no=23), 1467.1000, 'floor_100',144734200, true, true),
  ((SELECT id FROM transactions WHERE round_no=24), 1451.4800, 'floor_100',142125600, true, true),
  ((SELECT id FROM transactions WHERE round_no=25), 1429.7600, 'floor_100', 61542900, true, true),
  ((SELECT id FROM transactions WHERE round_no=26), 1451.9200, 'floor_100', 65666600, true, true),
  ((SELECT id FROM transactions WHERE round_no=27), 1451.9200, 'floor_100', 63664200, true, true),
  ((SELECT id FROM transactions WHERE round_no=28), 1429.7600, 'floor_100',134765700, true, true),
  ((SELECT id FROM transactions WHERE round_no=29), 1358.8200, 'floor_100', 57657000, true, true),
  ((SELECT id FROM transactions WHERE round_no=30), 1385.0200, 'floor_100',107668500, true, true),
  ((SELECT id FROM transactions WHERE round_no=31), 1390.5000, 'floor_100', 57840200, true, true),
  ((SELECT id FROM transactions WHERE round_no=32), 1385.0200, 'floor_100',118824750, true, true),
  ((SELECT id FROM transactions WHERE round_no=33), 1467.9600, 'floor_100',140760200, true, true),
  ((SELECT id FROM transactions WHERE round_no=34), 1439.2600, 'floor_100', 97677800, false, false)
ON CONFLICT (transaction_id) DO NOTHING;

-- ─────────────────────────────────────────
-- 4. 중간정산 비용 항목 (interim_cost_items)
-- ─────────────────────────────────────────

-- 1차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=1), '운송비',     1839234, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=1), '기타비용',    273900, false, 0, 2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=1), '관세',       3125600, false, 0, 3);

-- 2차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=2), '운송비',     3498614, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=2), '기타비용',    282600, false, 0, 2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=2), '환급',       -323400, false, 0, 3);

-- 3차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=3), '운송비',     2148322, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=3), '기타비용',    277200, false, 0, 2);

-- 4차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=4), '운송비',     2902299, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=4), '기타비용',    270600, false, 0, 2);

-- 5차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=5), '운송비',     2350642, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=5), '기타비용',    272800, false, 0, 2);

-- 6차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=6), '운송비',     2666397, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=6), '기타비용',    283800, false, 0, 2);

-- 7차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=7), '운송비',     2666707, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=7), '기타비용',    287100, false, 0, 2);

-- 8차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=8), '운송비',     2968280, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=8), '기타비용',    278300, false, 0, 2);

-- 9차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=9), '운송비',     3384896, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=9), '기타비용',    286000, false, 0, 2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=9), '관세',       3670896, false, 0, 3);

-- 10차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=10), '운송비',    2499880, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=10), '기타비용',   233200, false, 0, 2);

-- 11차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=11), '운송비',    2501310, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=11), '기타비용',   239800, false, 0, 2);

-- 12차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=12), '운송비',    2829880, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=12), '기타비용',   233200, false, 0, 2);

-- 13차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=13), '운송비',    2165842, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=13), '기타비용',   234300, false, 0, 2);

-- 14차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=14), '운송비',    1926026, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=14), '기타비용',   240900, false, 0, 2);

-- 15차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=15), '운송비',     763985, false, 0, 1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=15), '기타비용',   193600, false, 0, 2);

-- 16차 (상세 항목)
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=16), '운송비',    1423276, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=16), '통관보수료',  134200, true,  13420,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=16), '검역수수료',  110000, true,  11000,  3),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=16), '보관료',      115500, true,  11550,  4);

-- 17차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=17), '운송비',    2219185, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=17), '통관보수료',  128700, true,  12870,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=17), '검역수수료',  220000, true,  22000,  3),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=17), '정밀검역',    550000, true,  55000,  4);

-- 18차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=18), '운송비',    1419200, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=18), '통관보수료',  124000, true,  12400,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=18), '검역수수료',  100000, true,  10000,  3);

-- 19차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=19), '운송비',    1687300, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=19), '통관보수료',  124000, true,  12400,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=19), '검역수수료',  100000, true,  10000,  3);

-- 20차 (STGT)
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=20), '운송비',    1956054, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=20), '통관보수료',   70000, true,   7000,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=20), '검역수수료',  100000, true,  10000,  3),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=20), '정밀검역',    500000, true,  50000,  4);

-- 21차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=21), '운송비',    1237473, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=21), '통관보수료',   75000, true,   7500,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=21), '검역수수료',   50000, true,   5000,  3);

-- 22차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=22), '운송비',    1344099, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=22), '통관보수료',   82500, true,   8250,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=22), '검역수수료',   55000, true,   5500,  3);

-- 23차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=23), '운송비',    2228152, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=23), '통관보수료',  204600, true,  20460,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=23), '검역수수료',   55000, true,   5500,  3);

-- 24차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=24), '운송비',    1552109, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=24), '통관보수료',  201300, true,  20130,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=24), '검역수수료',   55000, true,   5500,  3);

-- 25차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=25), '운송비',    1071262, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=25), '통관보수료',   86900, true,   8690,  2);

-- 26차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=26), '운송비',    1232226, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=26), '통관보수료',   92400, true,   9240,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=26), '검역수수료',   55000, true,   5500,  3);

-- 27차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=27), '운송비',    1174688, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=27), '통관보수료',   88000, true,   8800,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=27), '검역수수료',   55000, true,   5500,  3);

-- 28차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=28), '운송비',    2228152, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=28), '통관보수료',  190300, true,  19030,  2);

-- 29차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=29), '운송비',    1159356, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=29), '통관보수료',   82500, true,   8250,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=29), '검역수수료',   55000, true,   5500,  3);

-- 30차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=30), '운송비',    1551649, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=30), '통관보수료',  151800, true,  15180,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=30), '검역수수료',  110000, true,  11000,  3);

-- 31차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=31), '운송비',    1062094, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=31), '통관보수료',   81400, true,   8140,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=31), '검역수수료',   55000, true,   5500,  3);

-- 32차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=32), '운송비',    1848789, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=32), '통관보수료',  168300, true,  16830,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=32), '검역수수료',   55000, true,   5500,  3);

-- 33차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=33), '운송비',    1881405, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=33), '통관보수료',  199100, true,  19910,  2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=33), '검역수수료',   55000, true,   5500,  3);

-- 34차
INSERT INTO interim_cost_items (interim_settlement_id, item_name, amount_krw, is_vat_taxable, vat_amount_krw, sort_order)
VALUES
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=34), '운송비',    1956494, false,  0,      1),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=34), '관세',      1324540, false,  0,      2),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=34), '통관보수료',  136400, true,  13640,  3),
  ((SELECT is2.id FROM interim_settlements is2 JOIN transactions t ON t.id=is2.transaction_id WHERE t.round_no=34), '검역수수료',   55000, true,   5500,  4);

-- ─────────────────────────────────────────
-- 5. 클로징정산 (closing_settlements) 1~32차
-- ─────────────────────────────────────────

INSERT INTO closing_settlements (transaction_id, closing_date, bok_exchange_rate, lc_payment_total_krw, fx_burden_a1_pct, rounding_policy, confirmed_amount_krw, is_paid, is_locked)
VALUES
  ((SELECT id FROM transactions WHERE round_no=1),  '2022-06-14', 1202.4000,  72782080, 50.00, 'none',      -180398,  true, true),
  ((SELECT id FROM transactions WHERE round_no=2),  '2022-08-03', 1313.7400, 117479886, 50.00, 'none',      6669414,  true, true),
  ((SELECT id FROM transactions WHERE round_no=3),  '2022-09-05', 1356.5000, 109583496, 50.00, 'none',      7042388,  true, true),
  ((SELECT id FROM transactions WHERE round_no=4),  '2022-10-07', 1404.2000, 106966339, 50.00, 'none',      8038121,  true, true),
  ((SELECT id FROM transactions WHERE round_no=5),  '2022-10-07', 1404.2000, 105146496, 50.00, 'none',      5677889,  true, true),
  ((SELECT id FROM transactions WHERE round_no=6),  '2023-01-05', 1274.7000,  98828128, 50.00, 'none',       360712,  true, true),
  ((SELECT id FROM transactions WHERE round_no=7),  '2023-01-02', 1267.7000, 100401840, 50.00, 'none',      1330371,  true, true),
  ((SELECT id FROM transactions WHERE round_no=8),  '2023-01-10', 1287.2000,  94531968, 50.00, 'none',      -129445,  true, true),
  ((SELECT id FROM transactions WHERE round_no=9),  '2023-03-24', 1287.2000,  94531968, 50.00, 'none',      3221209,  true, true),
  ((SELECT id FROM transactions WHERE round_no=10), '2023-06-02', 1315.2400,  73106300, 50.00, 'none',     -1580733,  true, true),
  ((SELECT id FROM transactions WHERE round_no=11), '2023-06-02', 1314.2400,  73050716, 50.00, 'none',     -1549461,  true, true),
  ((SELECT id FROM transactions WHERE round_no=12), '2023-06-02', 1314.2400,  78198331, 50.00, 'none',     -1952816,  true, true),
  ((SELECT id FROM transactions WHERE round_no=13), '2023-09-14', 1327.8000,  75716467, 50.00, 'none',     -2292995,  true, true),
  ((SELECT id FROM transactions WHERE round_no=14), '2023-09-14', 1327.8000,  79397129, 50.00, 'none',     -1990718,  true, true),
  ((SELECT id FROM transactions WHERE round_no=15), '2023-07-24', 1281.7000,  49185238, 50.00, 'none',       442043,  true, true),
  ((SELECT id FROM transactions WHERE round_no=16), '2023-08-02', 1331.3000,  80708731, 50.00, 'floor_100',-1642908,  true, true),
  ((SELECT id FROM transactions WHERE round_no=17), '2023-09-25', 1375.9000,  82421914, 50.00, 'floor_10', -4246753,  true, true),
  ((SELECT id FROM transactions WHERE round_no=18), '2024-02-19', 1340.1000,  83364941, 50.00, 'floor_100',-2362763,  true, true),
  ((SELECT id FROM transactions WHERE round_no=19), '2024-02-19', 1340.1000,  83364941, 50.00, 'floor_100',-2362763,  true, true),
  ((SELECT id FROM transactions WHERE round_no=20), '2024-02-22', 1340.1000,  44842426, 50.00, 'floor_100', -709631,  true, true),
  ((SELECT id FROM transactions WHERE round_no=21), '2024-11-10', 1396.8000,  49876515, 50.00, 'floor_100', -945253,  true, true),
  ((SELECT id FROM transactions WHERE round_no=22), '2025-03-19', 1466.5000,  53132102, 50.00, 'floor_100',-3045511,  true, true),
  ((SELECT id FROM transactions WHERE round_no=23), '2025-09-02', 1392.4000, 116773626, 50.00, 'floor_100', 1821903,  true, true),
  ((SELECT id FROM transactions WHERE round_no=24), '2025-08-01', 1390.4000, 116272200, 50.00, 'floor_100',  885070,  true, true),
  ((SELECT id FROM transactions WHERE round_no=25), '2025-09-02', 1400.4000,  51142608, 50.00, 'floor_100', -252656,  true, true),
  ((SELECT id FROM transactions WHERE round_no=26), '2025-09-02', 1392.4000,  53301072, 50.00, 'floor_100',  367801,  true, true),
  ((SELECT id FROM transactions WHERE round_no=27), '2025-09-02', 1392.4000,  50727917, 50.00, 'floor_100',  349543,  true, true),
  ((SELECT id FROM transactions WHERE round_no=28), '2025-09-26', 1400.4000, 112046004, 50.00, 'floor_100', -551969,  true, true),
  ((SELECT id FROM transactions WHERE round_no=29), '2025-09-26', 1438.5000,  51625463, 50.00, 'floor_100',-2419557,  true, true),
  ((SELECT id FROM transactions WHERE round_no=30), '2025-11-15', 1480.0000,  97782120, 50.00, 'floor_100',-5295349,  true, true),
  ((SELECT id FROM transactions WHERE round_no=31), '2025-11-15', 1480.0000,  52094890, 50.00, 'floor_100',-2763052,  true, true),
  ((SELECT id FROM transactions WHERE round_no=32), '2025-11-15', 1480.0000, 107842050, 50.00, 'floor_100',-5650431,  true, true)
ON CONFLICT (transaction_id) DO NOTHING;

-- ─────────────────────────────────────────
-- 6. LC 수수료 항목 (lc_fee_items)
-- ─────────────────────────────────────────

-- 1차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=1), 'LC이자수수료', 101026, 1);

-- 2차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=2), 'LC이자수수료', 1510144, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=2), 'LC부대비용',    703526, 2);

-- 3차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=3), 'LC이자수수료', 1731152, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=3), 'LC부대비용',    647506, 2);

-- 4차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=4), 'LC이자수수료', 1936364, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=4), 'LC부대비용',    663816, 2);

-- 5차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=5), 'LC이자수수료', 1193935, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=5), 'LC부대비용',    675418, 2);

-- 6차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=6), 'LC이자수수료', 2474371, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=6), 'LC부대비용',   1012243, 2);

-- 7차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=7), 'LC이자수수료', 1670043, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=7), 'LC부대비용',    700622, 2);

-- 8차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=8), 'LC이자수수료', 1733768, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=8), 'LC부대비용',    729681, 2);

-- 9차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=9), '개설수수료',   227542, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=9), '기한연장',      87997, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=9), '조건변경',      20000, 3),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=9), '인수수수료',   668649, 4),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=9), '기타(선적)',   -13897, 5),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=9), '결제이자',    3026973, 6);

-- 10차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=10), '개설수수료', 140870, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=10), '조건변경',    18000, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=10), '인수수수료', 397310, 3),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=10), '결제이자',  1675957, 4),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=10), '환급',        -5075, 5);

-- 11차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=11), '개설수수료', 140870, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=11), '조건변경',    18000, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=11), '인수수수료', 397310, 3),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=11), '결제이자',  1674683, 4),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=11), '환급',        -5075, 5);

-- 12차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=12), '개설수수료', 149035, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=12), '기한연장',    18000, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=12), '인수수수료', 425307, 3),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=12), '결제이자',  1792689, 4),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=12), '환급',        -5433, 5);

-- 13차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=13), '개설수수료', 153049, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=13), '조건변경',    18000, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=13), '인수수수료', 385954, 3),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=13), '결제이자',  1934711, 4),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=13), '환급',       -16245, 5);

-- 14차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=14), '개설수수료', 159273, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=14), '조건변경',    18000, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=14), '인수수수료', 416296, 3),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=14), '결제이자',  1992643, 4),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=14), '환급',       -37152, 5);

-- 15차 (상세)
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=15), '개설수수료',  95076, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=15), '조건변경',    18000, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=15), '인수수수료',  59470, 3);

-- 16차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=16), 'LC이자수수료', 2717224, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=16), 'LC부대비용',    151166, 2);

-- 17차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=17), 'LC이자수수료', 2645225, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=17), 'LC부대비용',    162157, 2);

-- 18차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=18), 'LC이자수수료', 2702340, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=18), 'LC부대비용',     93273, 2);

-- 19차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=19), 'LC이자수수료', 2698747, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=19), 'LC부대비용',     96866, 2);

-- 20차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=20), 'LC이자수수료', 1128518, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=20), 'LC부대비용',    171091, 2);

-- 21차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=21), 'LC이자수수료', 1607921, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=21), 'LC부대비용',    112414, 2);

-- 22차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=22), 'LC이자수수료', 1542962, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=22), 'LC부대비용',     93026, 2);

-- 23차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=23), 'LC이자수수료', 2731642, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=23), 'LC부대비용',    220481, 2);

-- 24차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=24), 'LC이자수수료', 3278115, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=24), 'LC부대비용',    228827, 2);

-- 25차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=25), 'LC이자수수료', 1431555, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=25), 'LC부대비용',    100047, 2);

-- 26차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=26), 'LC이자수수료', 1526017, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=26), 'LC부대비용',     83679, 2);

-- 27차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=27), 'LC이자수수료', 1437065, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=27), 'LC부대비용',     95836, 2);

-- 28차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=28), 'LC이자수수료', 3188174, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=28), 'LC부대비용',    176572, 2);

-- 29차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=29), 'LC이자수수료', 1470419, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=29), 'LC부대비용',     81259, 2);

-- 30차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=30), 'LC이자수수료', 3188174, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=30), 'LC부대비용',    176572, 2);

-- 31차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=31), 'LC이자수수료', 1780000, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=31), 'LC부대비용',    105470, 2);

-- 32차
INSERT INTO lc_fee_items (closing_settlement_id, item_name, amount_krw, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=32), 'LC이자수수료', 3188174, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=32), 'LC부대비용',    176572, 2);

-- ─────────────────────────────────────────
-- 7. 클로징 추가비용 항목 (closing_cost_items)
--    A) 통관보수료  B) 검역수수료  C) 운송추가운임
--    includes_vat=true 이면 VAT 포함 금액
-- ─────────────────────────────────────────

-- 1차: C) 운송추가운임=44,000 (VAT포함)
INSERT INTO closing_cost_items (closing_settlement_id, item_name, amount_krw, includes_vat, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=1), 'C) 운송추가운임', 44000, true, 3);

-- 2차: A)=182,600, B)=110,000, C)=40,800(VAT포함)
INSERT INTO closing_cost_items (closing_settlement_id, item_name, amount_krw, includes_vat, sort_order)
VALUES
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=2), 'A) 통관보수료',    182600, false, 1),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=2), 'B) 검역수수료',    110000, false, 2),
  ((SELECT cs.id FROM closing_settlements cs JOIN transactions t ON t.id=cs.transaction_id WHERE t.round_no=2), 'C) 운송추가운임',   40800, true,  3);

-- 3~8차: A/B/C 모두 0 (skip)

-- 16차: A/B/C 0 (no closing cost items)

-- 17차 이후도 A/B/C가 0인 경우 대부분이므로 레코드 미생성
-- (비용 항목이 0인 경우 DB에 삽입하지 않음)

COMMIT;
