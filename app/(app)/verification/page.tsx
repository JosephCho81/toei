import { createClient } from '@/lib/supabase/server'
import { StatCards } from '@/components/ui/StatCards'
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
      <h2 className="text-2xl font-bold" style={{ color: '#1B5E20' }}>원본문서 vs DB 항목별 검증</h2>

      <StatCards
        items={summary.map((card) => ({
          label: card.label,
          value: card.value.toLocaleString('ko-KR'),
          unit: '건',
          alert: card.value > 0,
        }))}
      />

      <div className="space-y-1">
        {rounds.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            대조할 원본문서가 적재돼 있지 않습니다.
          </p>
        )}
        {rounds.map((round) => <RoundAccordion key={round.roundNo} round={round} />)}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-sm text-muted-foreground">
        <span>일치</span>
        <span>소액차이 (≤100원)</span>
        <span className="text-red-700">불일치 (&gt;100원)</span>
        <span>DB미입력 (원본만 존재)</span>
        <span>DB전용 (DB만 존재)</span>
      </div>
    </div>
  )
}
