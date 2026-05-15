-- containers.container_no: NOT NULL 제약 해제
-- ETD/ETA만 알고 컨테이너 번호를 모르는 경우 NULL 허용
ALTER TABLE containers ALTER COLUMN container_no DROP NOT NULL;
