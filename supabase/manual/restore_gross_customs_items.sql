-- restore_gross_customs_items.sql
-- fix_gross_customs_items.sql 을 되돌린다.
--
-- 왜 따로 필요한가:
--   원래 스크립트가 만들게 되어 있던 백업 테이블 interim_cost_items_backup_20260904 이
--   비어 있다 (2026-09-04 실행 후 확인). 되돌릴 근거가 DB 안에 없다.
--   아래 값은 정정 **전** 라이브 DB 에서 그대로 읽어 둔 스냅샷이다.
--
-- 실행하면 amount_krw / vat_amount_krw / is_vat_taxable 이 정정 전으로 돌아간다.
-- is_duty(036) 는 건드리지 않는다 — 관세 플래그는 이 정정과 무관하다.

BEGIN;

UPDATE interim_cost_items ci
   SET amount_krw     = v.old_amount,
       vat_amount_krw = v.old_vat,
       is_vat_taxable = v.old_taxable
  FROM (VALUES
    ('6f747727-1b1a-440a-be70-93fcd784647d'::uuid, '통관보수료', 163900::numeric, 0::numeric, false),
    ('6f747727-1b1a-440a-be70-93fcd784647d'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('e25c315d-7ba4-491a-8d68-877c57e9c517'::uuid, '통관보수료', 167200::numeric, 0::numeric, false),
    ('e25c315d-7ba4-491a-8d68-877c57e9c517'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('0b36142f-0fce-4f87-8acf-40258dd6f7be'::uuid, '통관보수료', 162600::numeric, 0::numeric, false),
    ('0b36142f-0fce-4f87-8acf-40258dd6f7be'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('5acdafad-3ae1-433a-a11e-39f1b3cbdf40'::uuid, '통관보수료', 162800::numeric, 0::numeric, false),
    ('eb285bbf-df67-43bd-b006-3d7d944f3903'::uuid, '통관보수료', 168300::numeric, 0::numeric, false),
    ('eb285bbf-df67-43bd-b006-3d7d944f3903'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('02ac162c-33f3-4bb4-a356-90aa8a367412'::uuid, '통관보수료', 151800::numeric, 0::numeric, false),
    ('02ac162c-33f3-4bb4-a356-90aa8a367412'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('5d7a8b34-898a-420d-864b-5078e23f3748'::uuid, '통관보수료', 81400::numeric, 0::numeric, false),
    ('5d7a8b34-898a-420d-864b-5078e23f3748'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('e8c1b8a1-2e4c-44f4-bc63-5c6a990f8951'::uuid, '통관보수료', 198000::numeric, 0::numeric, false),
    ('e8c1b8a1-2e4c-44f4-bc63-5c6a990f8951'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('9f90c593-badc-49cd-874d-55e0a1dd7251'::uuid, '통관보수료', 136400::numeric, 0::numeric, false),
    ('9f90c593-badc-49cd-874d-55e0a1dd7251'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('27c32ec1-7614-4155-9e01-51fa813e83c8'::uuid, '통관보수료', 92400::numeric, 0::numeric, false),
    ('27c32ec1-7614-4155-9e01-51fa813e83c8'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('45ca4821-7995-4c18-bbbc-9473dca7b3f9'::uuid, '통관보수료', 199100::numeric, 0::numeric, false),
    ('45ca4821-7995-4c18-bbbc-9473dca7b3f9'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('4caf62fd-1e44-4f7d-8f6e-6d363ad5f0d6'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('310d22c0-e8b8-4cb3-b764-2a3f1ecf08e1'::uuid, '통관보수료', 136400::numeric, 0::numeric, false),
    ('310d22c0-e8b8-4cb3-b764-2a3f1ecf08e1'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('e5652009-b336-4e9c-af1a-cd3786697a85'::uuid, '통관보수료', 82500::numeric, 0::numeric, false),
    ('7646df41-c2ff-4a24-90ab-e84d12729612'::uuid, '통관보수료', 77000::numeric, 0::numeric, false),
    ('7646df41-c2ff-4a24-90ab-e84d12729612'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('7646df41-c2ff-4a24-90ab-e84d12729612'::uuid, '정밀검역비', 550000::numeric, 0::numeric, false),
    ('8aa970dd-0958-4fd4-8cc3-97fe2105a578'::uuid, '통관보수료', 130900::numeric, 0::numeric, false),
    ('8aa970dd-0958-4fd4-8cc3-97fe2105a578'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('a7cc216a-243c-432e-8131-5244169a6bcc'::uuid, '통관보수료', 129800::numeric, 0::numeric, false),
    ('a7cc216a-243c-432e-8131-5244169a6bcc'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('7b45c403-490f-4e35-b239-51bd3e4a343f'::uuid, '통관보수료', 123200::numeric, 0::numeric, false),
    ('7b45c403-490f-4e35-b239-51bd3e4a343f'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('beb83f39-f3ad-48dc-9e51-bae48d888bb9'::uuid, '통관보수료', 124300::numeric, 0::numeric, false),
    ('beb83f39-f3ad-48dc-9e51-bae48d888bb9'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('6c8ed09f-923d-46bc-a12a-f55103b5754a'::uuid, '통관보수료', 81400::numeric, 0::numeric, false),
    ('6c8ed09f-923d-46bc-a12a-f55103b5754a'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('44bab7dc-c927-4c2e-9619-b17c97b67ac7'::uuid, '통관보수료', 83600::numeric, 0::numeric, false),
    ('44bab7dc-c927-4c2e-9619-b17c97b67ac7'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('049eb18c-e307-4a41-afea-62bf7747a5b3'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('70508d23-2174-4770-bcee-1760e8832382'::uuid, '통관보수료', 190300::numeric, 0::numeric, false),
    ('9f847ce9-8a59-40d6-8bb0-f4bf5cd4d4c4'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('5acdafad-3ae1-433a-a11e-39f1b3cbdf40'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('a7523620-3bdc-46e5-869d-e2523126ec10'::uuid, '통관보수료', 168300::numeric, 0::numeric, false),
    ('a7523620-3bdc-46e5-869d-e2523126ec10'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('ab72394e-4744-4717-aac3-87ba146f6f57'::uuid, '통관보수료', 88000::numeric, 0::numeric, false),
    ('ab72394e-4744-4717-aac3-87ba146f6f57'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('e5652009-b336-4e9c-af1a-cd3786697a85'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('aaf18bf0-b0e3-4ce2-b688-75d713075001'::uuid, '통관보수료', 134200::numeric, 0::numeric, false),
    ('c5c443dc-cb82-4f01-b023-e2de708223d1'::uuid, '통관보수료', 128700::numeric, 0::numeric, false),
    ('c5c443dc-cb82-4f01-b023-e2de708223d1'::uuid, '검역수수료', 220000::numeric, 0::numeric, false),
    ('c5c443dc-cb82-4f01-b023-e2de708223d1'::uuid, '정밀검역비', 550000::numeric, 0::numeric, false),
    ('aaf18bf0-b0e3-4ce2-b688-75d713075001'::uuid, '검역수수료', 110000::numeric, 0::numeric, false),
    ('136226f8-f6d1-4ed2-83cc-f14056a1b7ba'::uuid, '통관보수료', 82500::numeric, 0::numeric, false),
    ('136226f8-f6d1-4ed2-83cc-f14056a1b7ba'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('63f4524c-a1f8-4f9d-8c24-3285770e6f99'::uuid, '통관보수료', 204600::numeric, 0::numeric, false),
    ('63f4524c-a1f8-4f9d-8c24-3285770e6f99'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('049eb18c-e307-4a41-afea-62bf7747a5b3'::uuid, '통관보수료', 201300::numeric, 0::numeric, false),
    ('34ace4a8-0075-447c-bdaf-170c9eeab287'::uuid, '통관보수료', 136400::numeric, 0::numeric, false),
    ('34ace4a8-0075-447c-bdaf-170c9eeab287'::uuid, '검역수수료', 55000::numeric, 0::numeric, false),
    ('7a1d4c81-1abd-4b73-87e2-e94c16137775'::uuid, '검역수수료', 55000::numeric, 0::numeric, false)
  ) AS v(sid, item_name, old_amount, old_vat, old_taxable)
 WHERE ci.interim_settlement_id = v.sid
   AND ci.item_name = v.item_name;

-- 62건이어야 한다.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM interim_cost_items ci
    JOIN interim_settlements s ON s.id = ci.interim_settlement_id
   WHERE s.vat_mode <> 'inclusive'
     AND ci.is_vat_taxable = false
     AND ci.is_import_vat  = false
     AND ci.amount_krw <> 0
     AND (ci.item_name LIKE '통관보수료%' OR ci.item_name LIKE '검역수수료%' OR ci.item_name LIKE '정밀검역비%');
  IF n <> 62 THEN
    RAISE EXCEPTION '되돌린 결과가 62건이 아니라 %건입니다 — 롤백합니다', n;
  END IF;
END $$;

COMMIT;
