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
| 13 | `supabase/migrations/025_*.sql` ~ `033_*.sql` | 파일 번호 순서대로 적용 |
| 14 | `supabase/migrations/034_settlement_payments.sql` | 분할·묶음 지급 원장 |
| 15 | `supabase/seed/payments_ledger.sql` | 통장 원장 초기 데이터 144건 (2022-02 ~ 2026-07) |
| 16 | `supabase/migrations/035_interim_invoiced_amount.sql` | 실제 청구액 컬럼 (확정값과 분리) |
| 17 | `supabase/seed/interim_invoiced.sql` | 1~39차 실제 청구액 |

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

조회처는 `resolveTracking()` 한 곳에서 정한다 (목록·상세·입력폼이 모두 이걸 쓴다).
**선사 판별은 반드시 Master B/L 로 한다** — 저장된 B/L 43건 중 42건이 포워더 House
B/L(`KULFE`·`WTTJ`·`PNKT`·`PKGI`·`STTS`)이고, `containers.carrier` 원문은 포워더명
(KORCHINA·PANAKOR 등)이거나 실제 선사와 어긋난 경우가 있다(09차: carrier 는 KMTC 인데
M B/L 은 `NSSL…`). House B/L 접두사를 선사 prefix 에 넣으면 안 된다 — `KULF` 가 KMTC
prefix 에 들어 있어 남성·ONE·에버그린 건까지 전부 고려해운으로 보내지는 버그가 있었다.

Master B/L 접두사 → 조회처 (2026-09 기준 실데이터 43건):

| M B/L | 건수 | 조회처 |
|-------|------|--------|
| `KMTC…` | 23 | 고려해운 |
| `NSSL…` | 7 | 남성해운 |
| `ONEY…` | 2 | ONE (앞 `ONEY` 를 떼고 12자리만 입력 — `queryFormat` 이 처리) |
| `EGLV…` | 1 | Evergreen |
| `HASL…`·`EASB…`·`JCSC…`·`3100…` | 6 | 선사 미등록 → 통관조회 |
| 없음 | 4 | 통관조회 (거래 상세에서 유니패스 조회를 돌리면 채워진다) |

통관조회로 가는 10건 중 2021~2022년 건은 유니패스 3년 보관 정책상 조회되지 않는다.

B/L 을 클릭하면 **조회 페이지가 새 탭으로 열리고 번호가 클립보드에 복사된다**
(딥링크가 되는 Maersk 만 조회 결과까지 바로 열린다). 링크 색이 초록이면 선사,
주황이면 통관조회이고, 툴팁에 왜 그 조회처인지가 적힌다.

---

## 화면 구성 — 지급 현황 / 정산 현황 / 거래 목록

세 화면이 답하는 질문이 다르다. **같은 값을 여러 화면에 늘리지 말 것.**

**첫 화면은 지급 현황이다** — `/` 와 `/(app)` 은 `/payments` 로 보낸다(로그인 복원 후에도 동일).

| | 답하는 질문 | 독자 |
|---|---|---|
| **지급 현황** (`/payments`) | 돈이 실제로 오갔나, 얼마가 남았나 | 양사 대표 · 기본 읽기 전용 |
| **정산 현황** (`/dashboard`) | 돈이 언제 오가나, 무엇이 늦었나 | 담당자 · 물류·정산 일정 |
| **거래 목록** (`/transactions`) | 무엇을 얼마에 샀나, 어디가 틀렸나 | 담당자 · 품목·금액 대조 |

- 정산 현황 컬럼: 회차 · 제조사 · 수입금액 · B/L · ETD · ETA · LC개설 · 중간정산 · 최종정산 · 상태
- 거래 목록 컬럼: 오류 · 회차 · P/O No. · 제조사 · 품목(펼침) · ETA · 상태

- 물류·정산 일정은 **정산 현황**이 담당한다. 거래 목록에서 LC 개설일·ETD 를 뺐다.
- ETA 만 양쪽에 있다 — 거래 목록 쪽은 `getEtaDisplay()` 로 컨테이너 ETA 가 없으면
  인도일(`delivery_dates`)로 대체해 보여주므로 같은 값이 아니다.
- 겹치는 회차·제조사·상태는 행을 식별하는 데 필요해 남긴다.

---

## 지급 원장 — 분할·묶음 지급

한 차수를 여러 번에 나눠 내고(28차 11회), 한 번의 이체가 여러 차수에 걸친다(10~12차·18~21차).
`interim_settlements.paid_date` 한 칸으로는 마지막 1회만 남아, **사실(통장)과 판단(몇 차 것인가)을 갈랐다.**

| 테이블 | 뜻 |
|---|---|
| `settlement_payments` | 통장 한 줄 = 한 행. 차수를 적지 않는다 |
| `payment_allocations` | 이체 1건 → 차수 n개. `confirmed=false` 면 「확인 대기」 |
| `v_settlement_payment_status` | 차수×구분별 지급 합계와 회차 목록(`installments`) |
| `v_payment_unallocated` | 이체별 미배분 잔액 — 알림이 읽는다 |

- **잔액은 `invoiced_amount_krw`(실제 청구액)로 낸다.** `confirmed_amount_krw`(시스템 확정값)로 내면
  35차에 5,544,495원 같은 허수 미지급이 생긴다 — 그건 미지급이 아니라 검산 차이다.
  둘 다 남기고 차이는 화면에 「검산차」로 표시한다
- **잔액·연체일은 저장하지 않는다.** 저장하면 원장과 어긋나는 순간 화면이 조용히 거짓말을 한다
- 배분 합계는 이체 금액을 **넘을 수 없고 모자라는 것은 허용**한다 — 모르는 돈은 미배분으로 둔다
- 입력은 `/payments` 에서 차수별로 한다. 여러 차수에 걸친 이체만 `/payments/ledger` 로 간다

#### 지급 현황 표 — 읽는 사람이 둘이다

이 화면은 **양사 대표**(한눈에 「얼마 남았나」)와 **담당자**(빨리 입력)가 같이 본다.
어느 한쪽에 맞추면 다른 쪽이 못 쓴다. 그래서:

- **기본은 차수당 한 줄.** 44개 차수를 접지 않고 전부 내보내되 한 줄로 요약한다.
  줄을 누르면 그 차수의 지급 회차·최종정산·검산 차이와 입력 버튼이 열린다
- **입력 모드를 두지 않는다.** 모드를 나누면 담당자가 매번 화면을 갈아타야 한다 —
  줄을 펴서 그 자리에서 입력·수정·삭제한다(줄 오른쪽 끝 `+` 는 hover 시 바로 뜬다)
- **정렬은 차수 내림차순 하나뿐** (44차 위, 1차 맨 아래). 상태순으로 섞으면 차수를 눈으로 좇을 수 없다
- 차수 표시는 `round_no` 로 한다(`roundName()`) — `round_label` 은 연도가 어긋난 행이 있다(1차가 「26년 01차」)
- 열: 차수 · 수입금액(USD) · 청구금액 · 지급액 · 미지급 · 기일 · 상태.
  **금액은 중간정산 기준**이고 최종정산은 펼친 상세와 하단 요약에만 둔다
- 폭은 `table-fixed` + 퍼센트로 못 박는다(합 100%). 한 열에 `w-full` 을 주면 남는 폭을
  혼자 다 먹어 나머지가 왼쪽에 몰린다
- **숫자 열은 오른쪽 정렬**(자릿수가 세로로 서야 눈으로 비교된다), **글자 열은 가운데 정렬**
- **괄호로 금액을 감싸지 않는다.** 회계에서 (숫자)는 음수다 — 아직 청구 전인 예상액은
  「예상 136,008,180」처럼 말을 앞에 붙인다

##### 색·글자 규칙 — 어기면 화면이 다시 어지러워진다

- **색은 빨강 하나만.** 손댈 곳이 빨강이고 나머지는 전부 회색조다. 상태마다 색을 주면
  44줄이 전부 물들어 정작 연체가 묻힌다. 상태별 배경색·왼쪽 색막대를 쓰지 않는다
- 빨강은 **「덜 나간 돈」에만** 쓴다. 초과 지급·기일 전 미지급·최종정산 미정산은 회색이다
- **문제 있는 줄에만** 그 아래 한 문장이 붙는다. 문장이 없으면 문제가 없다는 뜻이다
- 글자는 **크기 하나(`text-sm`)·서체 하나(본문 sans)**. 위계는 굵기와 색으로 낸다.
  금액 자릿수는 등폭 서체(`font-mono`)가 아니라 `tabular-nums` 로 맞춘다
- **부호로 방향을 말하지 않는다.** 「-3,221,209원」은 누가 누구에게 줄 돈인지 알 수 없다 —
  「에이원에서 돌아오지 않았습니다」처럼 말로 적고, 시점(토에이/에이원)에 따라 문장을 뒤집는다
- **내부 용어를 표에 올리지 않는다.** 「검산차」·「배분」·「미배분」은 대표가 모르는 말이다.
  펼친 상세에 풀어 쓰고, 알림 문장도 대표가 그대로 읽을 수 있게 쓴다

##### 대사(맞는지 확인)는 펼친 상세에서

- 분할 지급은 회차를 세로로 펴고 밑에 **「N회 합계 / 청구액 / 차액」 한 줄**을 둔다.
  합계는 저장값이 아니라 회차를 그 자리에서 더해 내고, 뷰 집계(`paid_krw`)와 어긋나면 그 사실을 띄운다
- 최종정산은 중간정산과 합치지 않는다 — 합치면 어느 쪽이 안 맞는지 알 수 없다
- 지급 기록은 있는데 청구액이 없는 차수(25차)는 「청구 전」이 아니라 **「청구액 미등록」**으로
  부르고 알림에 올린다 — 대조할 기준 자체가 없다는 뜻이다
- `transactions.payment_due_date` 는 청구 기일. 비어 있으면 `computeSettlementSchedule()` 계산값을 쓴다
  (2025-06-01 이전 개설분은 공식이 미확정이라 원본 「입금일」이 유일한 근거다)

### 초기 데이터 적재 후 남는 것 — 의도된 것이며 알림이 계속 띄운다

| 항목 | 현재 |
|---|---|
| 지급 기록 없는 연체 | 2차 중간정산 131,123,840원 (기일 2022-06-14) |
| 귀속 불명 입출금 | 5건 446,836,493원 (2022-03-24 ~ 2023-05-03, 원장 「모름」) |
| 배분 확인 대기 | 14건 — 10~12차 2건, 18~21차 12건. 실제 청구액으로 앞에서부터 채운 초기 배분이다 |
| 청구액 없이 나간 지급 | 25차 61,542,942원 (3회) — `interim_settlements` 행이 없어 대사 불가 |
| 12차 잔액 41,566원 | 10~12차 묶음 지급 270,621,502원이 세 차수 청구 합계보다 그만큼 모자란다 |

---

## 현재 미구현 항목

| 항목 | 상태 |
|------|------|
| 로그인/인증 | 비활성화 중 (`proxy.ts` AUTH_DISABLED 블록), 추후 별도 진행 |
