# META_PROMPTS — 토에이산교↔한국에이원 정산 시스템

AI 어시스턴트(Claude Code)가 이 프로젝트를 작업할 때 참조하는 컨텍스트 및 완료 현황.

---

## 전체 진행 현황

| Task | 내용 | 상태 |
|------|------|------|
| Task 1 | 1~41차 시드 데이터 Supabase MCP 적재 | ✅ 완료 |
| Task 2 | PDF 출력 기능 (중간정산·클로징정산) | ✅ 완료 |
| Task 3 | 거래 수정 페이지 | ✅ 완료 |
| Task 4 | Vercel 프로덕션 배포 | ✅ 완료 |

---

## Phase별 체크리스트

### Phase 1 — 스키마 & 데이터
- [x] Supabase 프로젝트 생성
- [x] 마이그레이션 001~006 적용
- [x] 시드 데이터 적재 (1~41차 전체)

### Phase 2 — 기능 구현
- [x] 대시보드 / 거래 목록
- [x] 거래 상세 / 등록 / 수정
- [x] 중간정산 / 클로징정산 페이지
- [x] PDF 출력
- [x] 컨테이너 관리
- [x] 제조사 관리
- [x] 환율 조회 (한국은행 API)
- [x] 감사 로그 UI
- [x] 엑셀 내보내기 API
- [x] 계산 로직 (`lib/calculations/`)
- [x] 선사 자동 판별 (`lib/tracking/`)

### Phase 3 — 배포
- [x] GitHub 레포 연결 (`JosephCho81/toei`)
- [x] Vercel 프로덕션 배포
- [x] 환경변수 설정

---

## 보류 항목 (미구현)

- [ ] **컨테이너 Edge Function 배포** — 코드 완성, 수동 배포 필요 (README 참고)
- [ ] **로그인/인증** — `proxy.ts` AUTH_DISABLED 블록으로 비활성화 중, 추후 별도 진행

---

## 코딩 컨벤션 & 주요 패턴

```
shadcn Button: asChild 미지원 → buttonVariants() + <Link> 사용
proxy.ts: Next.js 16 미들웨어 (구 middleware.ts)
Supabase join 결과: 항상 배열 → Array.isArray() 체크 필수
계산 로직: lib/calculations/ 에서만 처리
PDF 렌더링: serverExternalPackages: ['@react-pdf/renderer'] 설정 필요
```

---

## 인프라 정보

| 항목 | 값 |
|------|----|
| Supabase 프로젝트 ID | `roemjrdmccjpvcmmkper` (ap-northeast-2) |
| Vercel URL | `https://toei-a1-settlement.vercel.app` |
| GitHub | `JosephCho81/toei` (main → Production) |

---

## 마이그레이션 순서

1. `001_initial_schema.sql` — 기본 테이블
2. `002_policies_views_triggers.sql` — RLS, 뷰, 트리거
3. `003_transaction_items_deadlines.sql` — 항목·마감일
4. `004_deadline_trigger.sql` — 마감일 자동 계산
5. `005_containers_forwarding.sql` — 컨테이너·포워딩
6. `006_audit_logs_is_completed.sql` — 감사 로그·완료 플래그
7. `seed/migration_1_41.sql` — 1~41차 초기 데이터
