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
- `README.md` — 관세청 유니패스 연동(API001 화물통관진행정보 / API012 관세환율)과 그 한계.
  **B/L·통관환율·ETA 를 손으로 채우기 전에 여기부터 볼 것** — 자동으로 채워진다.
- 담당자용 사용 안내(HTML): https://claude.ai/code/artifact/cbc8f100-66e5-4237-9f2f-a7489cde2f9e

같은 조사를 세션마다 반복하지 말 것. 위 문서가 답을 갖고 있다.
