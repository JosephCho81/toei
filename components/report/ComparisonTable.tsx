import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface ComparisonData {
  interimRate: number | null
  closingRate: number | null
  interimAmount: number | null
  closingAmount: number | null
  interimProfitRate: number | null
  closingProfitRate: number | null
}

function signed(n: number, unit = '원'): string {
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('ko-KR')}${unit}`
}

function pct(n: number | null): string {
  return n != null ? `${n.toFixed(2)}%` : '-'
}

function diffCls(v: number | null): string {
  if (v == null) return ''
  return v > 0 ? 'text-green-600 font-semibold' : v < 0 ? 'text-red-600 font-semibold' : ''
}

export function ComparisonTable({ data }: { data: ComparisonData }) {
  const { interimRate, closingRate, interimAmount, closingAmount, interimProfitRate, closingProfitRate } = data

  const rateDiff = closingRate != null && interimRate != null ? closingRate - interimRate : null
  const amountDiff = closingAmount != null && interimAmount != null ? closingAmount - interimAmount : null
  const profitDiff = closingProfitRate != null && interimProfitRate != null
    ? closingProfitRate - interimProfitRate : null

  const rows = [
    {
      label: '적용환율',
      interim: interimRate != null ? `${interimRate.toLocaleString('ko-KR')}원/$` : '-',
      closing: closingRate != null ? `${closingRate.toLocaleString('ko-KR')}원/$` : '-',
      diff: rateDiff != null ? `${signed(rateDiff, '원/$')}` : '-',
      diffVal: rateDiff,
    },
    {
      label: '환율 차이',
      interim: '-',
      closing: '-',
      diff: rateDiff != null ? `${signed(rateDiff, '원')} (고시−통관)` : '-',
      diffVal: rateDiff,
    },
    {
      label: '정산금액',
      interim: interimAmount != null ? `${interimAmount.toLocaleString('ko-KR')}원` : '-',
      closing: closingAmount != null ? `${closingAmount >= 0 ? '+' : ''}${closingAmount.toLocaleString('ko-KR')}원` : '-',
      diff: amountDiff != null ? signed(amountDiff) : '-',
      diffVal: amountDiff,
    },
    {
      label: '수익률',
      interim: pct(interimProfitRate),
      closing: pct(closingProfitRate),
      diff: profitDiff != null
        ? `${profitDiff >= 0 ? '+' : ''}${profitDiff.toFixed(2)}pp`
        : '-',
      diffVal: profitDiff,
    },
  ]

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">항목</TableHead>
            <TableHead className="text-right">중간정산</TableHead>
            <TableHead className="text-right">클로징정산</TableHead>
            <TableHead className="text-right">차이</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="text-sm font-medium">{row.label}</TableCell>
              <TableCell className="text-right text-sm font-mono">{row.interim}</TableCell>
              <TableCell className="text-right text-sm font-mono">{row.closing}</TableCell>
              <TableCell className={`text-right text-sm font-mono ${diffCls(row.diffVal)}`}>{row.diff}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
