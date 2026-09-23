-- ✅ 2026-09-22 실행 완료 (서비스 키로 PostgREST 에서 같은 조건으로 실행: ① 4건 ② 42건 ③ 44건).
--    ① 의 백업 테이블 대신 원문을 interim_notes_backup_20260922.json 에 남겼다 — 되돌릴 때는 그 파일의 notes 를 id 로 되써 넣는다.
-- 담당자 2026-09-22 회신 반영 — SQL 에디터에서 실행 (잠금된 정산도 포함해야 해서 RLS 를 거치지 않는 곳에서 돈다)
-- 금액·확정금액·공급가는 바뀌지 않는다. 바뀌는 것은 비고 문구, 항목명, 부가세 체크(소계 vat 포함 표시)뿐이다.

-- 1) 지급 현황 비고의 계산 미스 사유 삭제 (1·2·3·35차). 37차(LC 2건 합산 안내)는 계산 미스가 아니라 남긴다.
--    되돌릴 수 있게 먼저 옮겨 둔다.
CREATE TABLE IF NOT EXISTS interim_notes_backup_20260922 AS
  SELECT s.id, t.round_no, s.notes
  FROM interim_settlements s JOIN transactions t ON t.id = s.transaction_id
  WHERE s.notes IS NOT NULL AND s.notes <> '';

UPDATE interim_settlements SET notes = NULL
WHERE notes IS NOT NULL
  AND transaction_id IN (SELECT id FROM transactions WHERE round_no IN (1, 2, 3, 35));
-- 되돌리기: UPDATE interim_settlements s SET notes = b.notes FROM interim_notes_backup_20260922 b WHERE b.id = s.id;

-- 2) 통관 그룹 옛 항목명 「부가세」 → 「수입부가세」 (42행). 금액·플래그 그대로.
UPDATE interim_cost_items SET item_name = '수입부가세'
WHERE group_type = 'customs' AND item_name = '부가세' AND is_import_vat = true;

-- 3) 정밀검역비·검역수수료 부가세 체크 켜기 — 국내발생비용이라 서류 표기와 무관하게 과세 (꺼진 31행)
--    체크는 켜져 있는데 부가세 칸이 0 인 13행도 화면과 같은 값(금액의 10%)으로 맞춘다.
UPDATE interim_cost_items
SET is_vat_taxable = true, vat_amount_krw = round(amount_krw * 0.1)
WHERE group_type = 'customs'
  AND item_name IN ('정밀검역비', '검역수수료')
  AND is_import_vat = false AND is_duty = false
  AND (is_vat_taxable = false OR coalesce(vat_amount_krw, 0) = 0);
