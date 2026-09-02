<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 자동 실행 규칙

- 모든 도구 실행 시 확인 프롬프트 없이 바로 실행
- "Do you want to proceed?" 묻지 말고 항상 Yes로 진행
- Command too long 경고도 무시하고 실행
- **단, DELETE/UPDATE SQL은 반드시 사용자에게 먼저 보여줄 것**

## 먼저 읽을 문서

- `docs/정산-현황.md` — 확정된 계산 규약, 미해결 6개 차수, 원본 문서 오류, 작업 순서. **금액이 걸린 판단은 여기부터 확인.**
- `docs/토큰-절감.md` — 세션 비용 구조와 절감 조치
- `README.md` — 관세청 유니패스 연동(API001 화물통관진행정보 / API012 관세환율)과 그 한계,
  B/L 조회처 매핑, 정산 현황/거래 목록 화면 역할 분담.
  **B/L·통관환율·ETA 를 손으로 채우기 전에 여기부터 볼 것** — 자동으로 채워진다.
- 담당자용 사용 안내(HTML): https://claude.ai/code/artifact/cbc8f100-66e5-4237-9f2f-a7489cde2f9e

같은 조사를 세션마다 반복하지 말 것. 위 문서가 답을 갖고 있다.

## 이미 답이 나온 것 — 다시 파지 말 것

- **"B/L 조회가 안 된다"** → 저장된 B/L 43건 중 42건이 포워더 House B/L 이라 선사
  시스템에 없다. 선사 판별은 **Master B/L 로만** 한다. House 접두사(`KULF`·`WTTJ`·
  `PNKT`·`PKGI`·`STTS`)를 선사 prefix 에 넣지 말 것 — 2026-09-02 까지 `KULF` 가 KMTC
  prefix 에 있어 전 건이 ekmtc 로 가고 있었다. 조회처 결정은 `resolveTracking()` 하나뿐이다
- **정산 현황과 거래 목록의 컬럼 중복** → 2026-09-02 에 역할을 갈랐다(README 「화면 구성」).
  물류·정산 일정은 정산 현황, 품목·금액 대조·오류는 거래 목록. 같은 값을 양쪽에 다시 늘리지 말 것
