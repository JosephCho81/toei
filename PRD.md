# PRD — 토에이산교↔한국에이원 수입 정산 관리 시스템

## 개요

토에이산교 코리아(일본 바이어)와 한국에이원(한국 공급사) 간 장갑 수입 거래의 정산 업무를 웹으로 자동화한다.  
수작업 Excel 정산을 대체하며, 1~41차 거래 데이터를 마이그레이션해 이전 이력도 포함한다.

---

## 기술 스택

- **Frontend**: Next.js 16.2.6 (App Router, Turbopack)
- **Backend/DB**: Supabase (PostgreSQL + RLS)
- **UI**: shadcn/ui v4 (@base-ui/react), Tailwind CSS v4
- **배포**: Vercel (Production: `https://toei-a1-settlement.vercel.app`)
- **저장소**: GitHub `JosephCho81/toei` (main → Vercel Production)

---

## Phase 1 — 기초 스키마 및 데이터

- [x] Supabase 프로젝트 생성 (ap-northeast-2, 서울)
- [x] 마이그레이션 001: 초기 스키마 (manufacturers, transactions, containers, interim/closing settlements)
- [x] 마이그레이션 002: RLS 정책, 뷰, 트리거
- [x] 마이그레이션 003: transaction_items, deadlines
- [x] 마이그레이션 004: 마감일 자동 계산 트리거
- [x] 마이그레이션 005: containers, forwarding 테이블 구조 보완
- [x] 마이그레이션 006: audit_logs, is_completed 컬럼
- [x] 시드 데이터 적재 (seed/migration_1_41.sql): 제조사 3, 거래 41, 중간정산 34, 비용항목 184, 클로징정산 32, LC수수료 166, 추가비용 8

---

## Phase 2 — 핵심 기능 구현

- [x] 대시보드 (거래 목록 + 상태 카드)
- [x] 거래 상세 페이지 (`/transactions/[id]`)
- [x] 거래 등록 페이지 (`/transactions/new`)
- [x] 거래 수정 페이지 (`/transactions/[id]/edit`, 잠금 시 자동 리다이렉트)
- [x] 중간정산 페이지 (`/transactions/[id]/interim`)
- [x] 클로징정산 페이지 (`/transactions/[id]/closing`)
- [x] 컨테이너 관리 페이지 (`/containers`)
- [x] 제조사 관리 페이지 (`/manufacturers`)
- [x] 환율 조회 페이지 (`/exchange-rates`, 한국은행 API 연동)
- [x] 감사 로그 (`/settings/audit`)
- [x] PDF 출력 — 중간정산 / 클로징정산 (`@react-pdf/renderer v4`)
- [x] 계산 로직 (`lib/calculations/`)
- [x] 컨테이너 선사 자동 판별 (`lib/tracking/`)

---

## Phase 3 — 배포 및 운영

- [x] GitHub 레포지토리 연결 (`JosephCho81/toei`, main → Vercel Production)
- [x] Vercel 프로덕션 배포 (`https://toei-a1-settlement.vercel.app`)
- [x] 환경변수 설정 (Vercel 대시보드)
- [x] 엑셀 내보내기 API (`/api/export/transactions`)

---

## 컨테이너 API 전략 (확정)

| 선사 | 방식 | 환경변수 |
|------|------|----------|
| Maersk (MRKU/MSKU/MRSU/TCKU/TGBU) | 공식 무료 API | `MAERSK_CLIENT_ID`, `MAERSK_CLIENT_SECRET` |
| Hapag-Lloyd (HLXU/HLCU/UACU/FSCU) | 공식 무료 API | `HAPAG_API_KEY` |
| 기타 선사 | 수기 입력 | — |

---

## 미구현 / 보류 항목

### 컨테이너 Edge Function 배포 (수동 배포 필요)
- Edge Function 코드는 작성 완료: `supabase/functions/sync-containers/index.ts`
- **Supabase CLI로 수동 배포 필요** — README의 배포 명령어 참고
- Supabase Dashboard에서 크론 스케줄(매일 00:00 UTC) 설정 필요

### 로그인 / 인증
- 현재 `proxy.ts`의 `AUTH_DISABLED` 블록으로 비활성화 상태
- Supabase Auth 테이블은 준비되어 있으나 실제 사용자 계정 미생성
- 추후 별도 진행 예정
