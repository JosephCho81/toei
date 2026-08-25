# 토에이산교↔한국에이원 수입 정산 관리 시스템

토에이산교 코리아(일본 바이어)와 한국에이원(한국 공급사) 간 장갑 수입 거래의 정산 업무를 웹으로 자동화한 시스템.

**프로덕션 URL**: https://toei-a1-settlement.vercel.app

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16.2.6 (App Router, Turbopack) |
| Database | Supabase (PostgreSQL + RLS) |
| UI | shadcn/ui v4, Tailwind CSS v4 |
| PDF | @react-pdf/renderer v4 |
| 배포 | Vercel |
| 저장소 | GitHub `JosephCho81/toei` |

---

## 환경변수

`.env.local.example` 참고:

```env
NEXT_PUBLIC_SUPABASE_URL=       # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service_role JWT
MAERSK_CLIENT_ID=               # Maersk API Client ID
MAERSK_CLIENT_SECRET=           # Maersk API Client Secret
HAPAG_API_KEY=                  # Hapag-Lloyd API Key
```

---

## 로컬 실행

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.local.example .env.local
# .env.local 편집 후 실제 값 입력

# 3. 마이그레이션 적용 (Supabase CLI 필요)
npx supabase db push

# 4. 개발 서버 실행
npm run dev
```

로컬: http://localhost:3000

---

## 마이그레이션 파일 목록 및 순서

아래 순서대로 적용해야 합니다.

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `supabase/migrations/001_initial_schema.sql` | 기본 테이블 (manufacturers, transactions, containers, settlements) |
| 2 | `supabase/migrations/002_policies_views_triggers.sql` | RLS 정책, 뷰, 트리거 |
| 3 | `supabase/migrations/003_transaction_items_deadlines.sql` | 거래 항목, 마감일 테이블 |
| 4 | `supabase/migrations/004_deadline_trigger.sql` | 마감일 자동 계산 트리거 |
| 5 | `supabase/migrations/005_containers_forwarding.sql` | 컨테이너·포워딩 구조 보완 |
| 6 | `supabase/migrations/006_audit_logs_is_completed.sql` | 감사 로그, 완료 플래그 |
| 7 | `supabase/seed/migration_1_41.sql` | 1~41차 초기 데이터 (시드) |
| 8 | `supabase/migrations/007_*.sql` ~ `020_*.sql` | 파일 번호 순서대로 적용 |
| 9 | `supabase/migrations/021_unit_carton.sql` | 기본 단위 Ct(카톤) 통일 |
| 10 | `supabase/migrations/022_transaction_amount_checks.sql` | 토에이 자료 대조금액 입력행 |
| 11 | `supabase/migrations/023_products.sql` | 품목 마스터 (선택 입력·자동 채움) |
| 12 | `supabase/migrations/024_transaction_flags.sql` | 거래 오류 표시·메모 |

---

## 컨테이너 Edge Function 수동 배포

Edge Function 코드는 완성되어 있지만, **배포는 수동으로 진행**해야 합니다.

### 1. 환경변수(시크릿) 설정

```bash
supabase secrets set MAERSK_CLIENT_ID=<your_maersk_client_id>
supabase secrets set MAERSK_CLIENT_SECRET=<your_maersk_client_secret>
supabase secrets set HAPAG_API_KEY=<your_hapag_api_key>
```

### 2. Function 배포

```bash
supabase functions deploy sync-containers --project-ref roemjrdmccjpvcmmkper
```

### 3. 크론 스케줄 설정

Supabase Dashboard → Database → Cron Jobs → New Cron Job:

```
Schedule:  0 0 * * *
Command:
  SELECT net.http_post(
    url := 'https://roemjrdmccjpvcmmkper.supabase.co/functions/v1/sync-containers',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
```

매일 09:00 KST(= 00:00 UTC)에 실행됩니다.

### 지원 선사

| 선사 | 컨테이너 접두사 |
|------|----------------|
| Maersk | MRKU, MSKU, MRSU, TCKU, TGBU |
| Hapag-Lloyd | HLXU, HLCU, UACU, FSCU |
| 기타 | 수기 입력 |

---

## 현재 미구현 항목

| 항목 | 상태 |
|------|------|
| 컨테이너 Edge Function 배포 | 수동 배포 필요 (위 가이드 참고) |
| 로그인/인증 | 비활성화 중 (`proxy.ts` AUTH_DISABLED 블록), 추후 별도 진행 |
