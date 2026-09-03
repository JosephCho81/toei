import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { PaymentAlerts as Alerts } from '@/lib/data/payments'

/**
 * 확인이 필요한 항목 알림.
 *
 * 닫기 버튼을 두지 않는다. 조건이 사라져야 없어진다 —
 * 2차 미지급이 1,500일 넘게 잊힌 것이 「나중에 보자」의 결과였다.
 */
export function PaymentAlerts({ alerts, editable }: { alerts: Alerts; editable: boolean }) {
  const items: { text: string; href?: string }[] = []

  for (const r of alerts.noRecord) {
    items.push({
      text: `${r.roundLabel} 중간정산 ${r.balanceKrw.toLocaleString('ko-KR')}원 — 대응하는 출금 기록이 없습니다 (${r.delayDays?.toLocaleString('ko-KR')}일 경과)`,
      href: `/transactions/${r.transactionId}`,
    })
  }
  if (alerts.overpaid.length > 0) {
    const sum = -alerts.overpaid.reduce((s, r) => s + r.balanceKrw, 0)
    items.push({
      text: `청구액보다 많이 나간 차수 ${alerts.overpaid.length}건 ${sum.toLocaleString('ko-KR')}원 (${alerts.overpaid.map((r) => r.roundLabel).join(', ')}) — 상계 여부 확인이 필요합니다`,
    })
  }
  for (const r of alerts.billedMissing) {
    items.push({
      text: `${r.roundLabel} 지급 ${Math.round(r.paidKrw).toLocaleString('ko-KR')}원이 기록돼 있으나 중간정산 청구액이 등재되지 않았습니다 — 대사할 기준이 없습니다`,
      href: `/transactions/${r.transactionId}`,
    })
  }
  if (alerts.unallocated.length > 0) {
    items.push({
      text: `귀속처를 모르는 입출금 ${alerts.unallocated.length}건 ${alerts.unallocatedKrw.toLocaleString('ko-KR')}원`,
      href: '/payments/ledger',
    })
  }
  if (alerts.unconfirmedPayments > 0) {
    items.push({
      text: `여러 차수에 걸쳐 지급된 ${alerts.unconfirmedPayments}건 — 차수별 배분 확인 대기`,
      href: '/payments/ledger',
    })
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-red-800">
            확인이 필요한 항목 {items.length}건이 남아 있어, 아래 잔액은 잠정치입니다.
          </p>
          <ul className="space-y-0.5 text-xs text-red-900">
            {items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <span>· {it.text}</span>
                {editable && it.href && (
                  <Link href={it.href} className="underline underline-offset-2">처리하기</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
