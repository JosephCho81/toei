import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { loadVerification } from '@/lib/verification/load'
import { RoundAccordion } from '@/components/verification/RoundAccordion'

export const dynamic = 'force-dynamic'

export default async function VerificationPage() {
  const rounds = await loadVerification(await createClient())

  const summary = [
    { label: '불일치 차수', value: rounds.filter((r) => r.badCount > 0).length },
    { label: '불일치 항목', value: rounds.reduce((s, r) => s + r.badCount, 0) },
    { label: 'DB 미입력', value: rounds.reduce((s, r) => s + r.srcOnlyCount, 0) },
  ]

  return (
    <div className="space-y-5 max-w-5xl">
      <h2 className="text-2xl font-bold">원본문서 vs DB 항목별 검증</h2>

      <div className="flex gap-3">
        {summary.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card px-5 py-3 min-w-28">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              card.value > 0 ? 'text-red-600' : 'text-green-600',
            )}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {rounds.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            대조할 원본문서가 적재돼 있지 않습니다.
          </p>
        )}
        {rounds.map((round) => <RoundAccordion key={round.roundNo} round={round} />)}
      </div>

      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t">
        <span>✅ 일치</span>
        <span>⚠️ 소액차이 (≤100원)</span>
        <span>🔴 불일치 (&gt;100원)</span>
        <span>← DB미입력 (원본만 존재)</span>
        <span>→ DB전용 (DB만 존재)</span>
      </div>
    </div>
  )
}
