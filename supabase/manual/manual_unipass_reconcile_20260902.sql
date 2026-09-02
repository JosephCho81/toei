-- 유니패스 화물통관진행정보 대조 결과 반영
-- 생성일: 2026-09-02 / 출처: 관세청 유니패스 오픈API (API001 cargCsclPrgsInfoQry)
-- 대조 43건 중 29건 조회 성공 (나머지 14건은 3년 보관주기 초과)
--
-- 실행 전 확인: BEGIN; 으로 감싸고 결과를 본 뒤 COMMIT 하는 것을 권장한다.

BEGIN;

-- ─────────────────────────────────────────
-- 1. 통관일 정정
-- ─────────────────────────────────────────
-- 26년 34차: 25년 32차의 통관일(2025-09-26)이 복사돼 있었다.
--   유니패스 원본 수입신고일 2026-03-06 (수리 2026-03-10, 입항 2026-03-03).
--   저장된 환율 1439.26 은 2026-03-01 적용개시 주 값으로 맞으므로 정산금액 영향 없음.
UPDATE transactions SET customs_date = '2026-03-06'
  WHERE round_no = 34 AND customs_date = '2025-09-26';

-- 26년 42차: 통관일이 비어 있었다. 유니패스 수입신고일 2026-08-25 (수리 2026-08-27).
UPDATE transactions SET customs_date = '2026-08-25'
  WHERE round_no = 42 AND customs_date IS NULL;

-- ─────────────────────────────────────────
-- 2. 컨테이너 번호 정정
-- ─────────────────────────────────────────
-- 26년 36차: KTMU9446283 -> KMTU9446286 (유니패스 원본).
--   ISO 6346 체크디짓: KTMU9446283 도 우연히 유효해서 형식검증으로는 못 걸렀다.
--   KMTU9446286 은 계산값 6 = 표기 6 으로 유효하다.
UPDATE containers SET container_no = 'KMTU9446286'
  WHERE container_no = 'KTMU9446283';

-- ─────────────────────────────────────────
-- 3. Master B/L 채우기 (전부 NULL 이었다)
--    채워두면 선사 사이트에서도 직접 조회할 수 있다.
-- ─────────────────────────────────────────
UPDATE containers SET mbl_no = 'KMTCPKG2270335'
  WHERE id = '2e6338f3-d525-4e21-80b7-9ca21c0ac172' AND mbl_no IS NULL;  -- 22년 13차 / KULFE2300278
UPDATE containers SET mbl_no = 'KMTCPKG2273733'
  WHERE id = 'fa28b939-ccd6-4d1b-a8d2-d5d9f7d46b24' AND mbl_no IS NULL;  -- 22년 14차 / KULFE2300310
UPDATE containers SET mbl_no = 'KMTCPKW0912885'
  WHERE id = '6315788b-4f17-4ec0-bdce-f4f7220c378f' AND mbl_no IS NULL;  -- 22년 15차 / KMTCPKW0912885
UPDATE containers SET mbl_no = 'KMTCPKW1017033'
  WHERE id = '4493dcbd-5d43-45bd-917d-dc8400e41405' AND mbl_no IS NULL;  -- 24년 19차 / KULFE2400355
UPDATE containers SET mbl_no = 'EGLV051400004262'
  WHERE id = '865f737e-cd51-42bf-b01a-fd0e42baf419' AND mbl_no IS NULL;  -- 24년 20차 / STTSE24030905
UPDATE containers SET mbl_no = 'NSSLPKICC2400040'
  WHERE id = '92174fd1-c3e4-4bd3-9482-5e1229a688a6' AND mbl_no IS NULL;  -- 24년 22차 / KULFE2401387
UPDATE containers SET mbl_no = 'KMTCPKG2578515'
  WHERE id = 'ad2008b3-35d5-4c98-b60d-52ba71ae104f' AND mbl_no IS NULL;  -- 24년 28차 / KULFE2500363
UPDATE containers SET mbl_no = 'KMTCPKW1149174'
  WHERE id = '03a8d24b-a74d-4d9b-9af5-414618338b4e' AND mbl_no IS NULL;  -- 25년 26차 / KULFE2500255
UPDATE containers SET mbl_no = 'KMTCPKW1175204'
  WHERE id = 'fba227d5-c46d-4943-b8f8-43dbde8b1842' AND mbl_no IS NULL;  -- 25년 29차 / KULFE2500623
UPDATE containers SET mbl_no = 'KMTCPKW1197622'
  WHERE id = 'e5f1353e-e5f4-4b51-871f-634555688303' AND mbl_no IS NULL;  -- 25년 30차 / KULFE2501019
UPDATE containers SET mbl_no = 'KMTCPKW1186818'
  WHERE id = '946b7ba9-c693-483b-80d0-2167f3d959dc' AND mbl_no IS NULL;  -- 25년 31차 / KULFE2500879
UPDATE containers SET mbl_no = 'KMTCPKW1198617'
  WHERE id = '0042f3b6-4b22-4b8f-8b18-c7289420958f' AND mbl_no IS NULL;  -- 25년 32차 / KULFE2501018
UPDATE containers SET mbl_no = 'KMTCPKG2346176'
  WHERE id = '14ce7d59-c7e0-4de9-bc0b-2d693e548b6e' AND mbl_no IS NULL;  -- 26년 16차 / KULFE2300826
UPDATE containers SET mbl_no = 'KMTCPKW0963541'
  WHERE id = 'ae5cf577-769a-4c06-87b9-3d8db08e3f9b' AND mbl_no IS NULL;  -- 26년 17차 / KULFE2301069
UPDATE containers SET mbl_no = 'KMTCPKW1017012'
  WHERE id = '5e06fefc-657e-4e97-9436-d7288971420c' AND mbl_no IS NULL;  -- 26년 18차 / KULFE2400353
UPDATE containers SET mbl_no = 'KMTCPKW1142173'
  WHERE id = '8fc3633c-f568-408b-9f9f-95bc64397667' AND mbl_no IS NULL;  -- 26년 23차 / KULFE2500249
UPDATE containers SET mbl_no = 'KMTCPKW1144172'
  WHERE id = '9c535cb3-084d-4f67-b8d9-b049f9296d11' AND mbl_no IS NULL;  -- 26년 27차 / KULFE2500250
UPDATE containers SET mbl_no = 'KMTCPKG2676863'
  WHERE id = '078738cb-cd96-4061-8c09-c2cc8e78c03c' AND mbl_no IS NULL;  -- 26년 33차 / KULFE2501478
UPDATE containers SET mbl_no = 'EASBJ2609XI8009'
  WHERE id = 'c3be64c7-ebde-4c7f-94f3-c005ce04e430' AND mbl_no IS NULL;  -- 26년 34차 / WTTJICN26022800
UPDATE containers SET mbl_no = 'NSSLPKICC2600021'
  WHERE id = 'f36e7a41-9d55-4180-840a-dca2dbab224a' AND mbl_no IS NULL;  -- 26년 35차 / KULFE2600312
UPDATE containers SET mbl_no = 'KMTCPKG2728138'
  WHERE id = '0ada2b66-f14a-408d-9a68-014ab60a24f1' AND mbl_no IS NULL;  -- 26년 36차 / KULFE2600340
UPDATE containers SET mbl_no = 'NSSLPKICC2600045'
  WHERE id = '38fd9f56-123a-4fdc-bb52-77d5ab7faf18' AND mbl_no IS NULL;  -- 26년 37차 / KULFE2600428
UPDATE containers SET mbl_no = 'NSSLPKICC2600046'
  WHERE id = '8599627a-db82-4b6a-bd7e-94fa29917430' AND mbl_no IS NULL;  -- 26년 37차 / KULFE2600429
UPDATE containers SET mbl_no = 'NSSLPKICC2600043'
  WHERE id = '4c6378e6-9ab9-40a4-8964-3ed21e9e030d' AND mbl_no IS NULL;  -- 26년 38차 / KULFE2600425
UPDATE containers SET mbl_no = 'NSSLPKICC2600044'
  WHERE id = 'be60d433-52bb-483d-8154-56352952fd88' AND mbl_no IS NULL;  -- 26년 39차 / KULFE2600424
UPDATE containers SET mbl_no = 'ONEYPKGG39309800'
  WHERE id = '2f9f1b6f-31b5-4061-94f9-59e633290722' AND mbl_no IS NULL;  -- 26년 40차 / KULFE2600620
UPDATE containers SET mbl_no = 'ONEYPKGG39311800'
  WHERE id = '6d9d89fc-9d85-42aa-99e8-f9b3cd652bbb' AND mbl_no IS NULL;  -- 26년 41차 / KULFE2600656
UPDATE containers SET mbl_no = 'NSSLPKICC2600107'
  WHERE id = 'd5e6900a-3cf7-4948-ab5b-5dcaf0971106' AND mbl_no IS NULL;  -- 26년 42차 / KULFE2600710
UPDATE containers SET mbl_no = 'JCSCFE766E010'
  WHERE id = 'f7eb679c-abac-4705-b28c-1842a4d38768' AND mbl_no IS NULL;  -- 26년 43차 / WTTJICN26080600

-- Master B/L 29건

-- ─────────────────────────────────────────
-- 4. 검증: 아래 조회로 결과를 확인한 뒤 COMMIT 한다.
-- ─────────────────────────────────────────
-- SELECT round_no, round_label, customs_date, customs_exchange_rate
--   FROM transactions WHERE round_no IN (34, 42);
-- SELECT bl_no, mbl_no, container_no FROM containers WHERE mbl_no IS NOT NULL ORDER BY bl_no;

COMMIT;

-- ─────────────────────────────────────────
-- 반영하지 않은 것
-- ─────────────────────────────────────────
-- ETA 12건: DB 값은 예정일, 유니패스는 실제 입항일이라 성격이 다르다.
--   덮어쓰면 "예정보다 며칠 늦었나"를 잃게 되므로 그대로 둔다.
-- 26년 36차 통관일 2026-05-08: 유니패스 신고일은 05-06, 수리일이 05-08 이다.
--   같은 주(05-03 적용개시)라 환율은 동일하므로 건드리지 않는다.
-- 24년 20차 통관일 2024-05-21 -> 05-22 도 같은 주라 영향 없다.
