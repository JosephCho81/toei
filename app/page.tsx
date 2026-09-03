import { redirect } from 'next/navigation'

// 첫 화면은 지급 현황 — 대표가 먼저 보는 것은 「돈이 오갔나」다
export default function RootPage() {
  redirect('/payments')
}
