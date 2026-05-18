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
}

export function ReportInterimSection({ data }: { data: InterimCostData }) {
  const itemsTotal = [...data.shippingItems, ...data.customsItems].reduce((s, r) => s + r.amount_krw, 0)
  const subTotal = data.importAmountKrw + itemsTotal + data.vatAmountKrw

  return (
    <ReportSection title="섹션 2 — 수입 원가 계산">
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
            <TableCell className="text-right font-mono">{data.importAmountKrw.toLocaleString('ko-KR')}원</TableCell>
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
          <TableRow className="bg-green-50 font-semibold border-t-2 border-green-200">
            <TableCell className="text-green-800">소계</TableCell>
            <TableCell />
            <TableCell className="text-right font-mono text-green-800">{subTotal.toLocaleString('ko-KR')}원</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </ReportSection>
  )
}
