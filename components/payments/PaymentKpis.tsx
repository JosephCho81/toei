import { StatCards } from '@/components/ui/StatCards'
import { SETTLED_THROUGH_ROUND, type PaymentSummary } from '@/lib/data/payments'

/**
 * 대표가 5초 안에 읽는 다섯 숫자.
 *
 * 돈의 방향은 하나다 — **한국에이원 → 토에이산교**. 중간정산·최종정산 모두
 * 양수면 에이원이 토에이에 낼 돈이다. 화면은 **에이원 기준**으로 고정한다.
 *
 * **남은 돈을 넷으로 가른다** (담당자 2026-09-10). 예전에는 「기일 경과」 한 칸이
 * 셋을 다 담고 있어, 2022년 2차 1억 3천만원이 이번 달 지급 중인 돈과 나란히 서 있었다.
 *
 *   연체            기일이 달을 넘겼다 — 지체상금으로 옮길 대상이다
 *   이번 달 지급 중  기일이 이번 달이다 — 지급이 도는 중이라 연체가 아니다
 *   지급금 차이      35차까지의 남은 금액 — 정산이 끝난 구간이라 연체로 부르지 않는다
 *   기일 미도래      아직 낼 때가 오지 않았다
 *
 * 넷을 합하면 전체 잔액이 된다. 색은 연체 하나에만 쓴다 —
 * 다섯 장을 다 칠하면 어느 것이 급한지 알 수 없다.
 */
export function PaymentKpis({ summary }: { summary: PaymentSummary }) {
  const krw = (n: number) => Math.round(n).toLocaleString('ko-KR')

  return (
    <StatCards
      items={[
        {
          label: '연체 (달 넘김)',
          value: krw(summary.overdueKrw),
          unit: '원',
          sub: summary.overdueCount > 0
            ? `${summary.overdueCount}개 차수 · 최장 ${summary.maxDelayDays.toLocaleString('ko-KR')}일 경과 · 지체상금 대상`
            : '없습니다',
          alert: summary.overdueKrw > 0,
        },
        {
          label: '이번 달 지급 중',
          value: krw(summary.inProgressKrw),
          unit: '원',
          sub: summary.inProgressCount > 0
            ? `${summary.inProgressCount}개 차수 · 기일이 이번 달입니다`
            : '없습니다',
        },
        {
          label: `지급금 차이 (${SETTLED_THROUGH_ROUND}차까지)`,
          value: krw(summary.settledGapKrw),
          unit: '원',
          sub: summary.settledGapCount > 0
            ? `${summary.settledGapCount}개 차수 · 정산이 끝난 구간의 차이입니다`
            : '없습니다',
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
