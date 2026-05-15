import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ReportSection, AmountRow } from './ReportSection'
import { formatKrw, formatDate } from '@/lib/utils/format'

interface FeeItem { item_name: string; amount_krw: number }

export interface ClosingData {
  closing_date: string | null
  bok_exchange_rate: number | null
  lc_payment_total_krw: number | null
  customs_exchange_rate: number | null
  importAmountKrw: number
  fxGainLossKrw: number
  lcFeeItems: FeeItem[]
  lcFeeTotalKrw: number
  fx_burden_a1_pct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  closingCostItems: FeeItem[]
  closingCostsTotalKrw: number
  confirmed_amount_krw: number | null
}

function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${formatKrw(n)}`
}

function FeeTable({ title, items, footerLabel, footerValue }: {
  title: string; items: FeeItem[]; footerLabel: string; footerValue: number
}) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
      <Table>
        <TableHeader>
          <TableRow><TableHead>항목</TableHead><TableHead className="text-right">금액(원)</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {items.map((f, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{f.item_name}</TableCell>
              <TableCell className="text-right text-sm font-mono">{f.amount_krw.toLocaleString('ko-KR')}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="text-sm">{footerLabel}</TableCell>
            <TableCell className="text-right text-sm font-mono">{footerValue.toLocaleString('ko-KR')}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

export function ReportClosingSection({ data }: { data: ClosingData }) {
  const fxIsGain = data.fxGainLossKrw >= 0
  const confirmed = data.confirmed_amount_krw

  return (
    <ReportSection title="섹션 4 — 클로징정산 내역">
      <div className="space-y-0.5 mb-4">
        <AmountRow label="클로징일" value={formatDate(data.closing_date)} />
        <AmountRow
          label="한국은행 고시 환율"
          value={data.bok_exchange_rate != null ? `${data.bok_exchange_rate.toLocaleString('ko-KR')}원/$` : '-'}
        />
        <AmountRow
          label="LC 결제비용(원화)"
          value={data.lc_payment_total_krw != null ? formatKrw(data.lc_payment_total_krw) : '-'}
        />
        <AmountRow
          label={`원금×통관환율 (${data.customs_exchange_rate?.toLocaleString('ko-KR')}원/$)`}
          value={formatKrw(data.importAmountKrw)}
        />
        <AmountRow
          label={`환차손익 (${fxIsGain ? '환차익' : '환차손'})`}
          value={signed(data.fxGainLossKrw)}
          color={fxIsGain ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      {data.lcFeeItems.length > 0 && (
        <FeeTable title="▸ LC 수수료" items={data.lcFeeItems} footerLabel="LC 수수료 합계" footerValue={data.lcFeeTotalKrw} />
      )}

      <Separator className="my-3" />
      <div className="space-y-0.5 mb-4">
        <AmountRow
          label={`환차손익 분담 비율 — 에이원 ${data.fx_burden_a1_pct}% / 토에이 ${100 - data.fx_burden_a1_pct}%`}
          value=""
        />
        <AmountRow label="에이원 부담분" value={signed(data.a1BurdenKrw)} />
        <AmountRow label="에이원 부담분 + VAT" value={signed(data.a1BurdenWithVatKrw)} bold />
      </div>

      {data.closingCostItems.length > 0 && (
        <FeeTable
          title="▸ 클로징 추가비용 (A+B+C)"
          items={data.closingCostItems.map((c, i) => ({ ...c, item_name: `${String.fromCharCode(65 + i)}) ${c.item_name}` }))}
          footerLabel="추가비용 소계"
          footerValue={data.closingCostsTotalKrw}
        />
      )}

      <Separator className="my-3" />
      {confirmed != null ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-500 mb-1">🏁 최종 정산</p>
          {confirmed === 0 ? (
            <p className="text-lg font-semibold text-blue-700">정산 없음 (상계)</p>
          ) : (
            <>
              <p className="text-sm text-blue-600 mb-1">
                {confirmed > 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'}
              </p>
              <p className="text-2xl font-bold text-blue-700">
                ₩ {Math.abs(confirmed).toLocaleString('ko-KR')}
              </p>
            </>
          )}
        </div>
      ) : (
        <AmountRow label="최종 정산 확정금액" value="-" bold />
      )}
    </ReportSection>
  )
}
