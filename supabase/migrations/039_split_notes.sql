-- 039_split_notes.sql
-- 비고를 목적별로 가른다. 2026-09-30 담당자 요청.
--
-- 지금까지 정산 비교·지급 현황이 interim_settlements.notes 한 칸을 같이 썼다.
-- 「어디서 어떻게 왜 틀렸는지」를 보려면 사유가 섞이면 안 된다.
--
--   notes            (중간·최종) 금액 차이 사유 — 기존 칸, 기존 내용 그대로
--   calc_diff_note   (중간·최종) 계산금액 차이 사유 — 청구금액이 시스템 계산과 어긋난 이유
--   payment_note     (차수)      지급 비고 — 지급 확인 요청·사유. 정산 비고와 섞지 않는다
--
-- 기존 notes 는 옮기지 않는다 (담당자 결정). 새 칸은 비어서 시작한다.
-- payment_note 를 transactions 에 두는 이유: 지급 현황은 차수 단위라
-- 중간정산이 아직 없는 차수에도 적을 수 있어야 한다.

ALTER TABLE interim_settlements
  ADD COLUMN IF NOT EXISTS calc_diff_note text;

ALTER TABLE closing_settlements
  ADD COLUMN IF NOT EXISTS calc_diff_note text;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_note text;

COMMENT ON COLUMN interim_settlements.calc_diff_note IS
  '계산금액 차이 사유 — 청구금액(토에이 계산)이 시스템 계산값과 다른 이유. 사람이 적는다.';
COMMENT ON COLUMN closing_settlements.calc_diff_note IS
  '계산금액 차이 사유 — 청구금액(토에이 계산)이 시스템 계산값과 다른 이유. 사람이 적는다.';
COMMENT ON COLUMN transactions.payment_note IS
  '지급 비고 — 지급 현황 전용. 정산 비고(notes·calc_diff_note)와 별개.';
