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

  return (
    <ReportSection title="III. 중간정산 내역">
      <Table>
        <TableHeader>
          <TableRow className="bg-green-50">
            <TableHead className="text-green-800 font-bold w-[40%]">항목</TableHead>
            <TableHead className="text-green-800 font-bold">계산식</TableHead>
            <TableHead className="text-right text-green-800 font-bold w-[28%]">금액 (KRW)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">수입금액 (원화환산)</TableCell>
            <TableCell className="text-muted-foreground text-xs font-mono">
              {data.importAmountUsd > 0 && data.customs_exchange_rate
                ? `$${data.importAmountUsd.toLocaleString('en-US')} × ${data.customs_exchange_rate.toLocaleString('ko-KR')}원`
                : ''}
            </TableCell>
            <TableCell
              className="text-right font-mono cursor-help"
              title={data.importAmountUsd > 0 && data.customs_exchange_rate
                ? `$${data.importAmountUsd.toLocaleString('en-US')} × ${data.customs_exchange_rate.toLocaleString('ko-KR')}원/$ = ${data.importAmountKrw.toLocaleString('ko-KR')}원`
                : undefined}
            >
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
          <TableRow>
            <TableCell className="font-medium">부가세</TableCell>
            <TableCell className="text-muted-foreground text-xs">(원가합계) × 10%</TableCell>
            <TableCell className="text-right font-mono">{data.vatAmountKrw.toLocaleString('ko-KR')}원</TableCell>
          </TableRow>
          {showConfirmed ? (
            <TableRow className="bg-green-700 font-bold border-t-2 border-green-800">
              <TableCell className="text-white text-base">중간정산 확정금액</TableCell>
              <TableCell />
              <TableCell
                className="text-right font-mono text-white text-base cursor-help"
                title={`수입원가 + 통관비 + 운송비 + 부가세 = ${data.confirmedAmountKrw!.toLocaleString('ko-KR')}원`}
              >
                {data.confirmedAmountKrw!.toLocaleString('ko-KR')}원
              </TableCell>
            </TableRow>
          ) : (
            <TableRow className="bg-green-50 font-semibold border-t-2 border-green-200">
              <TableCell className="text-green-800">소계</TableCell>
              <TableCell />
              <TableCell className="text-right font-mono text-green-800">{subTotal.toLocaleString('ko-KR')}원</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {data.interimDirection && (
        <div className="mt-2 inline-flex items-center bg-green-700 text-white rounded px-3 py-1">
          <span className="text-sm font-semibold">{data.interimDirection}</span>
        </div>
      )}
    </ReportSection>
  )
}
