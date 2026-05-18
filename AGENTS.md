<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Supabase 쿼리 실행 규칙

- SELECT / INSERT 등 조회·입력 쿼리는 확인 없이 즉시 실행한다.
- **DELETE / UPDATE는 반드시 SQL을 먼저 사용자에게 보여주고 확인을 받은 후 실행한다.**
