-- 021_unit_carton.sql
-- 기본 단위를 카톤(Ct)으로 통일.
-- 실데이터는 168행 중 167행이 이미 'Ct'이며, 남은 'DZ' 1행은 담당자 확인 결과 오타.

ALTER TABLE transaction_items ALTER COLUMN unit SET DEFAULT 'Ct';

UPDATE transaction_items SET unit = 'Ct' WHERE unit = 'DZ';
