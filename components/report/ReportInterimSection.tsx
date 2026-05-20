import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ReportSection } from './ReportSection'

interface CostItem {
  item_name: string
  amount_krw: number
  is_vat_taxable: boolean
  vat_amount_krw: number
  group_type: string
}

export interface InterimCostData {
  customs_exchange_rate: number | null
  importAmountUsd: number
  importAmountKrw: number
  marginRatePct?: number | null
  shippingItems: CostItem[]
  customsItems: CostItem[]
  vatAmountKrw: number
  confirmedAmountKrw?: number | null
  interimDirection?: string | null
}

export function ReportInterimSection({ data }: { data: InterimCostData }) {
  const itemsTotal = [...data.shippingItems, ...data.customsItems].reduce((s, r) => s + r.amount_krw, 0)
  const subTotal = data.importAmountKrw + itemsTotal + data.vatAmountKrw
  const showConfirmed = data.confirmedAmountKrw != null
  const confirmedDiff = showConfirmed ? data.confirmedAmountKrw! - subTotal : 0

  const marginSuffix = data.marginRatePct
    ? ` × ${(1 + data.marginRatePct / 100).toFixed(2)}(마진율 1+${data.marginRatePct}%)`
    : ''
  const importFormula = data.importAmountUsd > 0 && data.customs_exchange_rate
    ? `$${data.importAmountUsd.toLocaleString('en-US')}(수입금액USD) × ${data.customs_exchange_rate.toLocaleString('ko-KR')}원(통관환율)${marginSuffix}`
    : ''

  const allItems = [...data.shippingItems, ...data.customsItems]
  const subTotalFormula = [
    `수입금액 ${data.importAmountKrw.toLocaleString('ko-KR')}`,
    ...allItems.map(i => `${i.item_name} ${i.amount_krw.toLocaleString('ko-KR')}`),
    ...(data.vatAmountKrw > 0 ? [`부가세 ${data.vatAmountKrw.toLocaleString('ko-KR')}`] : []),
  ].join(' + ')

  return (
    <ReportSection title="III. 중간정산 내역">
      <Table>
        <TableHeader>
          <TableRow className="bg-green-50">
            <TableHead className="text-green-800 font-bold w-[36%]">항목</TableHead>
            <TableHead className="text-green-800 font-bold">계산식</TableHead>
            <TableHead className="text-right text-green-800 font-bold w-[26%]">금액 (KRW)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">수입금액 (원화환산)</TableCell>
            <TableCell className="text-muted-foreground text-xs font-mono leading-relaxed">
              {importFormula}
            </TableCell>
            <TableCell className="text-right font-mono">
              {data.importAmountKrw.toLocaleString('ko-KR')}원
            </TableCell>
          </TableRow>
          {data.shippingItems.map((item, i) => (
            <TableRow key={`sh-${i}`} className="bg-muted/20">
              <TableCell className="pl-6 text-muted-foreground text-sm">{item.item_name}</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono text-sm">{item.amount_krw.toLocaleString('ko-KR')}원</TableCell>
            </TableRow>
          ))}
          {data.customsItems.map((item, i) => (
            <TableRow key={`cu-${i}`} className="bg-muted/20">
              <TableCell className="pl-6 text-muted-foreground text-sm">{item.item_name}</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono text-sm">{item.amount_krw.toLocaleString('ko-KR')}원</TableCell>
            </TableRow>
          ))}
          {data.vatAmountKrw > 0 && (
            <TableRow>
              <TableCell className="font-medium">부가세</TableCell>
              <TableCell className="text-muted-foreground text-xs">(원가합계) × 10%</TableCell>
              <TableCell className="text-right font-mono">{data.vatAmountKrw.toLocaleString('ko-KR')}원</TableCell>
            </TableRow>
          )}
          {showConfirmed ? (
            <>
              <TableRow className="bg-muted/10 border-t border-dashed">
                <TableCell className="text-muted-foreground text-sm">
                  소계 <span className="text-xs">(시스템 계산)</span>
                </TableCell>
                <TableCell className="text-xs text-gray-400 font-mono">{subTotalFormula}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {subTotal.toLocaleString('ko-KR')}원
                </TableCell>
              </TableRow>
              <TableRow className="bg-green-100 font-bold border-t-2 border-green-200">
                <TableCell className="text-green-800 text-base">중간정산 확정금액</TableCell>
                <TableCell className="text-xs">
                  <span className="text-green-700">수기입력 (엑셀 기준)</span>
                  {Math.abs(confirmedDiff) > 0 && (
                    <div className="text-orange-600 mt-0.5">
                      ※ 시스템 대비 {confirmedDiff > 0 ? '+' : ''}{confirmedDiff.toLocaleString('ko-KR')}원 차이
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-green-800 text-base">
                  {data.confirmedAmountKrw!.toLocaleString('ko-KR')}원
                </TableCell>
              </TableRow>
            </>
          ) : (
            <TableRow className="bg-green-50 font-semibold border-t-2 border-green-200">
              <TableCell className="text-green-800">소계</TableCell>
              <TableCell className="text-xs text-gray-400 font-mono">{subTotalFormula}</TableCell>
              <TableCell className="text-right font-mono text-green-800">{subTotal.toLocaleString('ko-KR')}원</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {data.interimDirection && (
        <div className="mt-2 inline-flex items-center bg-green-100 text-green-800 rounded px-3 py-1">
          <span className="text-sm font-semibold">{data.interimDirection}</span>
        </div>
      )}
    </ReportSection>
  )
}
