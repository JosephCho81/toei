import { formatKrw } from '@/lib/utils/format'
import { ReportSection } from './ReportSection'
import { AmountRow, FeeTable, signed } from './ReportRows'
import type { ClosingData } from './ReportClosingSection'

export function ReportClosingLcSection({ data, fxIsGain, additionalCost, exclusive }: {
  data: ClosingData
  fxIsGain: boolean
  additionalCost: number
  exclusive: boolean
}) {
  return (
    <>
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
    </>
  )
}
