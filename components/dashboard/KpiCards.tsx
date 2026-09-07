import { StatCards } from '@/components/ui/StatCards'

/**
 * 선택한 기간의 두 숫자: 몇 건, 얼마.
 * 진행 상황은 아래 거래 테이블의 정산일 컬럼이 건별로 보여주므로 여기서 요약하지 않는다.
 *
 * 카드 모양은 지급 현황과 같은 것을 쓴다 — 화면마다 카드가 다르게 생기면
 * 같은 시스템으로 읽히지 않는다.
 */
export function KpiCards({ totalCount, totalUsd, periodLabel }: {
  totalCount: number
  totalUsd: number
  periodLabel: string
}) {
  return (
    <StatCards
      items={[
        {
          label: '거래 건수',
          value: totalCount.toLocaleString('ko-KR'),
          unit: '건',
          sub: periodLabel,
        },
        {
          label: '총 수입금액',
          value: `$${Math.round(totalUsd).toLocaleString('en-US')}`,
          sub: periodLabel,
        },
      ]}
    />
  )
}
