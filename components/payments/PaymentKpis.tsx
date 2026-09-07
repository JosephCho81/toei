import { StatCards } from '@/components/ui/StatCards'
import type { PaymentSummary } from '@/lib/data/payments'

/**
 * 대표가 5초 안에 읽는 네 숫자.
 *
 * 돈의 방향은 하나다 — **한국에이원 → 토에이산교**. 중간정산·최종정산 모두
 * 양수면 에이원이 토에이에 낼 돈이다(리포트·PDF 의 「한국에이원 → 토에이산교 지급」과 같다).
 * 화면은 **에이원 기준**으로 고정한다 — 시점 토글은 없앴다(담당자 2026-09-05).
 *
 * **미지급금은 기일이 지난 것만 센다** (담당자 2026-09-05:
 * 「지급 중(36차)이나 지급일이 돌아오지 않은건 미수로 잡지 않는 것이 좋아보입니다」).
 * 합쳐 놓으면 잔액 6.6억 중 5.1억이 「아직 낼 때가 아닌 돈」이라 숫자가 겁만 주고 쓸모가 없다.
 * 기일 미도래분은 옆 칸에 따로 세우고, 언제 나가는지는 아래 월별 표가 답한다.
 *
 * 색은 기일 경과 하나에만 쓴다. 네 장을 다 칠하면 어느 것이 급한지 알 수 없다.
 */
export function PaymentKpis({ summary }: { summary: PaymentSummary }) {
  const krw = (n: number) => Math.round(n).toLocaleString('ko-KR')

  return (
    <StatCards
      items={[
        {
          label: '미지급금 (기일 경과)',
          value: krw(summary.overdueKrw),
          unit: '원',
          sub: summary.overdueCount > 0
            ? `${summary.overdueCount}개 차수 · 최장 ${summary.maxDelayDays.toLocaleString('ko-KR')}일 경과`
            : '없습니다',
          alert: summary.overdueKrw > 0,
        },
        {
          label: '기일 미도래',
          value: krw(summary.notDueKrw),
          unit: '원',
          sub: summary.notDueCount > 0
            ? `${summary.notDueCount}개 차수 · 가장 이른 기일 ${summary.nextDue?.dueDate ?? '미정'}`
            : '없습니다',
        },
        {
          label: '청구 예정',
          value: krw(summary.plannedKrw),
          unit: '원',
          sub: summary.plannedCount > 0 ? `${summary.plannedCount}개 차수 · 아직 청구 전` : '없습니다',
        },
        {
          label: '지급 누계',
          value: krw(summary.paidKrw),
          unit: '원',
          sub: `청구 누계 ${krw(summary.billedKrw)}원`
            + (summary.overpaidCount > 0
              ? ` · 초과 지급 ${summary.overpaidCount}개 차수 ${krw(summary.overpaidKrw)}원`
              : ''),
        },
      ]}
    />
  )
}
