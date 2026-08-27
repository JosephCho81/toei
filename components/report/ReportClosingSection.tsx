import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ReportSection } from './ReportSection'
import { formatKrw, formatDate } from '@/lib/utils/format'

interface FeeItem { item_name: string; amount_krw: number }

export interface ClosingData {
  closing_date: string | null
  bok_exchange_rate: number | null
  lc_payment_total_krw: number | null
  customs_exchange_rate: number | null
  importAmountUsd?: number | null
  importAmountKrw: number
  fxGainLossKrw: number
  lcFeeItems: FeeItem[]
  lcFeeTotalKrw: number
  fx_burden_a1_pct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  /** 'exclusive' = 공급가(부담분+추가비용) + 부가세 10%. 'inclusive' = 구방식 */
  vatMode?: 'inclusive' | 'exclusive'
  supplyAmountKrw?: number
  outputVatKrw?: number
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

function AmountRow({ label, value, color, bold, formula }: {
  label: string; value: string; color?: string; bold?: boolean; formula?: string
}) {
  return (
    <div className="py-0.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${bold ? 'font-semibold' : 'font-medium'} ${color ?? ''}`}>{value}</span>
      </div>
      {formula && <p className="text-xs text-gray-400 mt-0.5 font-mono">{formula}</p>}
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
  const exclusive = data.vatMode !== 'inclusive'
  const additionalCost = data.lcFeeTotalKrw - data.fxGainLossKrw
  const supplyKrw = data.supplyAmountKrw ?? (data.a1BurdenKrw + data.closingCostsTotalKrw)
  const outputVatKrw = data.outputVatKrw ?? Math.round(supplyKrw * 0.1)
  const systemClosingConfirmed = exclusive
    ? supplyKrw + outputVatKrw
    : data.a1BurdenWithVatKrw + data.closingCostsTotalKrw
  const closingDiff = confirmed != null ? confirmed - systemClosingConfirmed : 0

  const closingDirection = confirmed != null && confirmed !== 0
    ? confirmed > 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  const grandDirection = data.grandTotalKrw != null && data.grandTotalKrw !== 0
    ? data.grandTotalKrw > 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  return (
    <>
      {/* V-1: 환율 정보 */}
      <ReportSection title="V-1. 환율 정보">
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <InfoRow
            label="통관환율 (입고시)"
            value={data.customs_exchange_rate != null
              ? `${data.customs_exchange_rate.toLocaleString('ko-KR')}원/$`
              : '-'}
          />
          <InfoRow
            label="클로징환율 (BOK고시)"
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

      {/* V-2: LC 결제 내역 (LC 결제 + 수수료 + 추가비용 분담 통합) */}
      <ReportSection title="V-2. LC 결제 내역">
        <div className="space-y-1 mb-3">
          <AmountRow
            label="LC 결제비용 (토에이 지불)"
            value={data.lc_payment_total_krw != null ? formatKrw(data.lc_payment_total_krw) : '-'}
          />
          <AmountRow
            label={`원금 × 통관환율 (${data.customs_exchange_rate?.toLocaleString('ko-KR')}원/$)`}
            value={formatKrw(data.importAmountKrw)}
            formula={
              data.importAmountUsd && data.customs_exchange_rate
                ? `$${data.importAmountUsd.toLocaleString('en-US')}(수입금액USD) × ${data.customs_exchange_rate.toLocaleString('ko-KR')}원(통관환율) = ${data.importAmountKrw.toLocaleString('ko-KR')}원`
                : undefined
            }
          />
          <div className="py-0.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{`환율차액 (환차${fxIsGain ? '익' : '손'})`}</span>
              <span className={`font-mono font-semibold ${fxIsGain ? 'text-blue-600' : 'text-red-600'}`}>
                {signed(data.fxGainLossKrw)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {data.lc_payment_total_krw != null
                ? `원금×통관환율 ${data.importAmountKrw.toLocaleString('ko-KR')}원 - LC결제비용 ${data.lc_payment_total_krw.toLocaleString('ko-KR')}원 = ${signed(data.fxGainLossKrw)}`
                : `원금×통관환율 - LC결제비용 = ${signed(data.fxGainLossKrw)}`}
            </p>
          </div>
        </div>
        {data.lcFeeItems.length > 0 && (
          <div className="mb-3">
            <FeeTable
              title="▸ LC 제비용"
              items={data.lcFeeItems}
              footerLabel="LC 제비용 합계"
              footerValue={data.lcFeeTotalKrw}
            />
          </div>
        )}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-muted/20">
            <div className="flex text-sm">
              <span className="w-56 text-muted-foreground shrink-0">추가비용 합계 (VAT 별도)</span>
              <span className={`font-mono font-medium ${additionalCost < 0 ? 'text-red-600' : ''}`}>
                {signed(additionalCost)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              LC제비용 {signed(data.lcFeeTotalKrw)} - 환차{fxIsGain ? '익' : '손'} {signed(data.fxGainLossKrw)} = {signed(additionalCost)}
            </p>
          </div>
          <div className="flex text-sm py-1.5 px-3 border-b">
            <span className="w-56 text-muted-foreground shrink-0">분담 비율</span>
            <span>에이원 {data.fx_burden_a1_pct}% / 토에이 {100 - data.fx_burden_a1_pct}%</span>
          </div>
          <div className="px-3 py-1.5 border-b">
            <div className="flex text-sm">
              <span className="w-56 text-muted-foreground shrink-0">에이원 부담 (VAT 별도)</span>
              <span className="font-mono font-medium">{signed(data.a1BurdenKrw)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              추가비용 {signed(additionalCost)} × {data.fx_burden_a1_pct}%(에이원분담) = {signed(data.a1BurdenKrw)}
            </p>
          </div>
          {exclusive ? (
            <div className="px-3 py-1.5">
              <p className="text-xs text-gray-400 font-mono">
                부가세는 기타 미정산 비용까지 더한 공급가에 한 번에 적용된다 (V-4 참조)
              </p>
            </div>
          ) : (
            <div className="px-3 py-1.5">
              <div className="flex text-sm">
                <span className="w-56 text-muted-foreground shrink-0">에이원 부담 (VAT 포함)</span>
                <span className="font-mono font-semibold">{signed(data.a1BurdenWithVatKrw)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                VAT별도 {signed(data.a1BurdenKrw)} × 1.1(VAT 10%) = {signed(data.a1BurdenWithVatKrw)}
              </p>
            </div>
          )}
        </div>
      </ReportSection>

      {/* V-3: 기타 미정산 비용 */}
      {data.closingCostItems.length > 0 && (
        <ReportSection title="V-3. 기타 미정산 비용 (A+B+C)">
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

      {/* V-4: 클로징 정산금액 */}
      {confirmed != null && (
        <ReportSection title="V-4. 클로징 정산금액">
          {/* 계산 breakdown */}
          <div className="border border-border rounded-lg overflow-hidden mb-3 text-sm">
            <div className="flex justify-between px-4 py-2 border-b bg-muted/10">
              <span className="text-muted-foreground">
                {exclusive ? '에이원 부담 (VAT 별도)' : '에이원 부담 (VAT 포함)'}
              </span>
              <span className="font-mono">{signed(exclusive ? data.a1BurdenKrw : data.a1BurdenWithVatKrw)}</span>
            </div>
            {data.closingCostItems.map((item, i) => (
              <div key={i} className="flex justify-between px-4 py-1.5 border-b bg-muted/5">
                <span className="text-muted-foreground pl-3">+ {item.item_name}</span>
                <span className="font-mono">{signed(item.amount_krw)}</span>
              </div>
            ))}
            {data.closingCostItems.length > 0 && (
              <div className="flex justify-between px-4 py-1.5 border-b">
                <span className="text-muted-foreground">기타 미정산 합계</span>
                <span className="font-mono">{signed(data.closingCostsTotalKrw)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2 bg-muted/20 border-t-2">
              <span className="text-muted-foreground font-medium">= 최종정산 (시스템 계산)</span>
              <span className="font-mono font-semibold">{signed(systemClosingConfirmed)}</span>
            </div>
          </div>
          <div className={`border-2 rounded-lg p-4 ${confirmed < 0 ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
            <p className={`text-2xl font-bold font-mono mb-1 ${confirmed < 0 ? 'text-red-700' : 'text-amber-800'}`}>
              {signed(confirmed)}
            </p>
            {Math.abs(closingDiff) > 0 && (
              <p className="text-xs text-orange-600 mb-2 font-mono">
                ※ 엑셀 확정값 {confirmed.toLocaleString('ko-KR')}원 (시스템 {systemClosingConfirmed.toLocaleString('ko-KR')}원 대비 {closingDiff > 0 ? '+' : ''}{closingDiff.toLocaleString('ko-KR')}원)
              </p>
            )}
            {closingDirection && (
              <div className={`inline-flex items-center rounded px-3 py-1 ${confirmed < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                <span className="text-sm font-semibold">{closingDirection}</span>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {/* VI: 종합 정산 */}
      {hasGrandTotal && (
        <ReportSection title="VI. 종합 정산">
          <div className="border border-green-300 rounded-lg overflow-hidden mb-3">
            <div className="flex justify-between text-sm py-2 px-4 border-b bg-muted/10">
              <span className="text-muted-foreground">중간정산 확정금액</span>
              <span className="font-mono text-green-700">+{formatKrw(data.interimConfirmedKrw!)}</span>
            </div>
            <div className="flex justify-between text-sm py-2 px-4 border-b">
              <span className="text-muted-foreground">클로징 정산금액</span>
              <span className={`font-mono ${(confirmed ?? 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {signed(confirmed ?? 0)}
              </span>
            </div>
            <div className="flex justify-between font-bold text-base py-2 px-4 bg-green-50">
              <span className="text-green-900">종합정산액</span>
              <span className="font-mono text-green-900">{formatKrw(data.grandTotalKrw!)}</span>
            </div>
          </div>
          {grandDirection && (
            <div className="bg-green-100 text-green-800 rounded-lg px-4 py-4 text-center">
              <p className="text-xs text-green-600 mb-1">최종 정산</p>
              <p className="text-sm font-bold mb-1">{grandDirection}</p>
              <p className="text-2xl font-bold font-mono">₩ {Math.abs(data.grandTotalKrw!).toLocaleString('ko-KR')}</p>
            </div>
          )}
        </ReportSection>
      )}

      {!hasGrandTotal && confirmed != null && (
        <ReportSection title="VI. 종합 정산">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">클로징 최종 정산</p>
            <p className="text-2xl font-bold font-mono text-green-800">
              {formatKrw(Math.abs(confirmed))}
            </p>
            {closingDirection && (
              <div className="mt-2 inline-flex items-center bg-green-100 text-green-800 rounded px-3 py-1">
                <span className="text-sm font-semibold">{closingDirection}</span>
              </div>
            )}
          </div>
        </ReportSection>
      )}
    </>
  )
}
