import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ReportSection } from './ReportSection'
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
  interimConfirmedKrw: number | null
  grandTotalKrw: number | null
}

function signed(n: number) {
  return `${n >= 0 ? '+' : ''}${formatKrw(n)}`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm py-1 border-b last:border-0">
      <span className="w-48 text-muted-foreground shrink-0 font-medium">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}

function AmountRow({ label, value, color, bold }: {
  label: string; value: string; color?: string; bold?: boolean
}) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? 'font-semibold' : 'font-medium'} ${color ?? ''}`}>{value}</span>
    </div>
  )
}

function FeeTable({ title, items, footerLabel, footerValue }: {
  title: string; items: FeeItem[]; footerLabel: string; footerValue: number
}) {
  if (!items.length) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{title}</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>항목</TableHead>
            <TableHead className="text-right">금액(원)</TableHead>
          </TableRow>
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
  const hasGrandTotal = data.interimConfirmedKrw != null && data.grandTotalKrw != null

  const closingDirection = confirmed != null && confirmed !== 0
    ? confirmed > 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  const grandDirection = data.grandTotalKrw != null && data.grandTotalKrw !== 0
    ? data.grandTotalKrw > 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  return (
    <>
      {/* 섹션 2: 환율 정보 */}
      <ReportSection title="섹션 2 — 환율 정보">
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <InfoRow
            label="통관환율 (입고시)"
            value={data.customs_exchange_rate != null
              ? `${data.customs_exchange_rate.toLocaleString('ko-KR')}원/$`
              : '-'}
          />
          <InfoRow
            label="클로징환율 (L/C 결제)"
            value={data.bok_exchange_rate != null
              ? `${data.bok_exchange_rate.toLocaleString('ko-KR')}원/$`
              : '-'}
          />
          <InfoRow
            label="LC 결제일"
            value={formatDate(data.closing_date)}
          />
        </div>
      </ReportSection>

      {/* 섹션 3: LC 결제 내역 */}
      <ReportSection title="섹션 3 — LC 결제 내역">
        <div className="space-y-1">
          <AmountRow
            label={`원금 × 통관환율 (${data.customs_exchange_rate?.toLocaleString('ko-KR')}원/$)`}
            value={formatKrw(data.importAmountKrw)}
          />
          <AmountRow
            label="LC 결제비용 (원화)"
            value={data.lc_payment_total_krw != null ? formatKrw(data.lc_payment_total_krw) : '-'}
          />
          <Separator className="my-2" />
          <AmountRow
            label={`환차${fxIsGain ? '익' : '손'} (${fxIsGain ? 'A1 유리' : 'A1 불리'})`}
            value={signed(data.fxGainLossKrw)}
            color={fxIsGain ? 'text-green-600' : 'text-red-600'}
            bold
          />
        </div>
        {data.lcFeeItems.length > 0 && (
          <div className="mt-3">
            <FeeTable
              title="▸ LC 수수료"
              items={data.lcFeeItems}
              footerLabel="LC 수수료 합계"
              footerValue={data.lcFeeTotalKrw}
            />
          </div>
        )}
      </ReportSection>

      {/* 섹션 4: 추가비용 및 분담 */}
      <ReportSection title="섹션 4 — 추가비용 및 분담">
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex text-sm py-1.5 px-3 border-b bg-muted/20">
            <span className="w-56 text-muted-foreground shrink-0">추가비용 합계 (VAT 별도)</span>
            <span className={`font-mono font-medium ${data.a1BurdenKrw !== 0 ? (data.a1BurdenKrw < 0 ? 'text-red-600' : '') : ''}`}>
              {signed(data.fxGainLossKrw + data.lcFeeTotalKrw)}
            </span>
          </div>
          <div className="flex text-sm py-1.5 px-3 border-b">
            <span className="w-56 text-muted-foreground shrink-0">분담 비율</span>
            <span>에이원 {data.fx_burden_a1_pct}% / 토에이 {100 - data.fx_burden_a1_pct}%</span>
          </div>
          <div className="flex text-sm py-1.5 px-3 border-b">
            <span className="w-56 text-muted-foreground shrink-0">에이원 부담 (VAT 별도)</span>
            <span className="font-mono font-medium">{signed(data.a1BurdenKrw)}</span>
          </div>
          <div className="flex text-sm py-1.5 px-3">
            <span className="w-56 text-muted-foreground shrink-0">에이원 부담 (VAT 포함)</span>
            <span className="font-mono font-semibold">{signed(data.a1BurdenWithVatKrw)}</span>
          </div>
        </div>
      </ReportSection>

      {/* 섹션 5: 기타 미정산 비용 (A+B+C) */}
      {data.closingCostItems.length > 0 && (
        <ReportSection title="섹션 5 — 기타 미정산 비용 (A+B+C)">
          <FeeTable
            title=""
            items={data.closingCostItems.map((c, i) => ({
              ...c,
              item_name: `${String.fromCharCode(65 + i)}) ${c.item_name}`,
            }))}
            footerLabel="소계 (VAT 별도)"
            footerValue={data.closingCostsTotalKrw}
          />
        </ReportSection>
      )}

      {/* 섹션 6: 종합 정산 */}
      <ReportSection title="섹션 6 — 종합 정산">
        {/* 클로징 정산 */}
        {confirmed != null && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">클로징 정산액</p>
            <p className={`text-xl font-bold font-mono ${confirmed < 0 ? 'text-red-700' : 'text-amber-800'}`}>
              {signed(confirmed)}
            </p>
            {closingDirection && (
              <p className="text-xs text-amber-700 mt-1">{closingDirection}</p>
            )}
          </div>
        )}

        {/* 종합 정산 (중간 + 클로징) */}
        {hasGrandTotal && (
          <div className="bg-green-50 border-2 border-green-600 rounded-lg p-5">
            <p className="text-xs font-bold text-green-700 mb-3">최종 종합 정산 (중간정산 + 클로징)</p>
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">중간정산 확정금액</span>
                <span className="font-mono text-green-700">+{formatKrw(data.interimConfirmedKrw!)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">클로징 정산액</span>
                <span className={`font-mono ${(confirmed ?? 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {signed(confirmed ?? 0)}
                </span>
              </div>
              <Separator className="border-green-200 my-1" />
              <div className="flex justify-between font-bold text-base">
                <span className="text-green-900">종합정산액</span>
                <span className="font-mono text-green-900">{signed(data.grandTotalKrw!)}</span>
              </div>
            </div>
            {grandDirection && (
              <div className="bg-green-700 text-white rounded px-4 py-2 text-center">
                <p className="text-xs text-green-200 mb-0.5">최종 정산 방향</p>
                <p className="text-sm font-bold">{grandDirection}</p>
                <p className="text-lg font-bold font-mono mt-1">{formatKrw(Math.abs(data.grandTotalKrw!))}</p>
              </div>
            )}
          </div>
        )}

        {!hasGrandTotal && confirmed != null && (
          <div className="bg-green-50 border-2 border-green-600 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">클로징 최종 정산</p>
            <p className="text-2xl font-bold font-mono text-green-800">
              {formatKrw(Math.abs(confirmed))}
            </p>
            {closingDirection && (
              <div className="mt-2 inline-flex items-center bg-green-700 text-white rounded px-3 py-1">
                <span className="text-sm font-semibold">{closingDirection}</span>
              </div>
            )}
          </div>
        )}
      </ReportSection>
    </>
  )
}
