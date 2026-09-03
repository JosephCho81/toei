import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { roundName, type PaymentAlerts as Alerts } from '@/lib/data/payments'

/**
 * 확인이 필요한 항목 알림.
 *
 * 닫기 버튼을 두지 않는다. 조건이 사라져야 없어진다 —
 * 2차 미지급이 1,500일 넘게 잊힌 것이 「나중에 보자」의 결과였다.
 *
 * 문장은 대표가 그대로 읽을 수 있게 쓴다. 「배분」·「미배분」 같은 내부 용어를 쓰지 않는다.
 */
export function PaymentAlerts({ alerts }: { alerts: Alerts }) {
  const items: { text: string; href?: string; action?: string }[] = []

  for (const r of alerts.noRecord) {
    items.push({
      text: `${roundName(r)} ${r.balanceKrw.toLocaleString('ko-KR')}원이 기일에서 `
        + `${r.delayDays?.toLocaleString('ko-KR')}일 지나도록 나간 기록이 없습니다`,
      href: `/transactions/${r.transactionId}`,
      action: '거래 보기',
    })
  }
  if (alerts.overpaid.length > 0) {
    const sum = -alerts.overpaid.reduce((s, r) => s + r.balanceKrw, 0)
    items.push({
      text: `청구액보다 많이 나간 차수가 ${alerts.overpaid.length}개 있습니다 `
        + `(${alerts.overpaid.map(roundName).join(', ')} · 합계 ${sum.toLocaleString('ko-KR')}원). `
        + '다음 차수에서 상계했는지 확인이 필요합니다',
    })
  }
  for (const r of alerts.billedMissing) {
    items.push({
      text: `${roundName(r)}은 ${Math.round(r.paidKrw).toLocaleString('ko-KR')}원이 나갔는데 `
        + '청구액이 등록되어 있지 않아 맞는지 대조할 수 없습니다',
      href: `/transactions/${r.transactionId}`,
      action: '거래 보기',
    })
  }
  if (alerts.unallocated.length > 0) {
    items.push({
      text: `어느 차수 것인지 모르는 입출금이 ${alerts.unallocated.length}건 `
        + `${alerts.unallocatedKrw.toLocaleString('ko-KR')}원 있습니다`,
      href: '/payments/ledger',
      action: '통장 원장에서 처리',
    })
  }
  if (alerts.unconfirmedPayments > 0) {
    items.push({
      text: `한 번에 여러 차수를 묶어 낸 이체가 ${alerts.unconfirmedPayments}건 있습니다 — `
        + '차수별로 얼마씩인지 아직 사람이 확인하지 않았습니다',
      href: '/payments/ledger',
      action: '통장 원장에서 처리',
    })
  }

  if (items.length === 0) return null

  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
      <div className="flex gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-red-800">
            확인할 것이 {items.length}건 남아 있어, 아래 금액은 아직 확정이 아닙니다.
          </p>
          <ul className="space-y-1 text-red-900">
            {items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-2">
                <span>· {it.text}</span>
                {it.href && (
                  <Link href={it.href} className="underline underline-offset-2">{it.action}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
