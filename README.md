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
BOK_API_KEY=                    # 한국은행 ECOS (클로징 환율)
UNIPASS_API_KEY_CARGO=          # 관세청 유니패스 API001 화물통관진행정보
UNIPASS_API_KEY_FXRATE=         # 관세청 유니패스 API012 관세환율 정보
```

유니패스 인증키는 unipass.customs.go.kr 회원가입 후
**My메뉴 → 서비스관리 → OpenAPI 사용관리**에서 API 별로 따로 발급받는다 (즉시 승인).

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

## 관세청 유니패스 연동

House B/L 로 통관 정보를 조회하는 유일한 공식 경로다. 포워더가 끊은 House B/L(`KULFE…`)은
선사 시스템에 등재되지 않고, 컨테이너 번호는 재사용되므로 선사 사이트에서 다른 화물이 나온다.

| API | 모듈 | 라우트 | 쓰임 |
|---|---|---|---|
| API001 화물통관진행정보 | `lib/tracking/unipass.ts` | `POST /api/unipass` | 입항일·선사·Master B/L·선박/항차·컨테이너번호 자동 입력 |
| API012 관세환율 정보 | `lib/tracking/customsRate.ts` | `POST /api/customs-rate` | 통관환율 자동 입력 + 수기 입력값 대조 |

인증키는 서버에서만 읽는다(라우트 프록시). 클라이언트로 내려가지 않는다.

### 알려진 한계

- **출항일(ETD)은 제공하지 않는다.** 관세청은 한국 입항 이후만 다룬다 — ETD 는 수기 입력이다
- **보관주기 3년.** `'23.06.17` 부터 3년 이내 데이터만 조회된다
- 조회 결과가 다건이면 `ntceInfo` 가 `[N00]` 으로 시작하고 목록이 온다. 목록의 화물관리번호로
  다시 호출해야 상세를 받는다 (`fetchUnipassCargo` 가 처리)
- `수입 제세 납부여부`(API) 는 유효한 신고번호를 넣어도 서버 오류만 돌아와 사용하지 않는다

### B/L 조회 링크

`lib/tracking/carriers.ts` 에 선사 12곳의 화물추적 URL 과 prefix 가 있다. 2026-09-02 에
전부 실제 접속해 확인했고, 딥링크(번호를 URL 에 실어 보내기)는 Maersk 만 지원한다.
나머지는 조회 페이지를 열고 번호를 클립보드에 복사한다.

---

## 현재 미구현 항목

| 항목 | 상태 |
|------|------|
| 로그인/인증 | 비활성화 중 (`proxy.ts` AUTH_DISABLED 블록), 추후 별도 진행 |
