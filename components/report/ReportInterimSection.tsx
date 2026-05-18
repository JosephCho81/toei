import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ReportSection, AmountRow } from './ReportSection'
import { formatKrw, formatDate } from '@/lib/utils/format'

interface CostItem {
  item_name: string
  amount_krw: number
  is_vat_taxable: boolean
  vat_amount_krw: number
  group_type: string
}

interface InterimData {
  customs_exchange_rate: number | null
  confirmed_amount_krw: number | null
  updated_at: string | null
  shippingItems: CostItem[]
  customsItems: CostItem[]
  vatAmountKrw: number
  importAmountKrw: number
}

function CostTable({ title, items }: { title: string; items: CostItem[] }) {
  if (!items.length) return null
  const total = items.reduce((s, r) => s + r.amount_krw, 0)
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
          {items.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm">{item.item_name}</TableCell>
              <TableCell className="text-right text-sm font-mono">{item.amount_krw.toLocaleString('ko-KR')}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-semibold">
            <TableCell className="text-sm">소계</TableCell>
            <TableCell className="text-right text-sm font-mono">{total.toLocaleString('ko-KR')}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

export function ReportInterimSection({ data }: { data: InterimData }) {
  const shippingTotal = data.shippingItems.reduce((s, r) => s + r.amount_krw, 0)
  const customsTotal = data.customsItems.reduce((s, r) => s + r.amount_krw, 0)

  return (
    <ReportSection title="섹션 3 — 중간정산 내역">
      <div className="mb-4 space-y-0.5">
        {data.customs_exchange_rate != null && (
          <>
            <AmountRow label="통관환율 (수입증권 기재)" value={`${data.customs_exchange_rate.toLocaleString('ko-KR')}원/$`} />
            <AmountRow label="수입원가(원화)" value={formatKrw(data.importAmountKrw)} />
          </>
        )}
      </div>
      <CostTable title="▸ 해상운임 세부 (그룹A)" items={data.shippingItems} />
      <CostTable title="▸ 통관비용 세부 (그룹B)" items={data.customsItems} />
      <Separator className="my-3" />
      <div className="space-y-0.5">
        <AmountRow label="해상운임 소계 (VAT 별도)" value={formatKrw(shippingTotal)} />
        <AmountRow label="통관비용 소계 (VAT 별도)" value={formatKrw(customsTotal)} />
        <AmountRow label="부가세 합계" value={formatKrw(data.vatAmountKrw)} />
        <Separator className="my-2" />
        <AmountRow
          label="중간정산 확정금액 (VAT 포함)"
          value={data.confirmed_amount_krw != null ? formatKrw(data.confirmed_amount_krw) : '-'}
          bold
        />
        <AmountRow label="정산일" value={data.updated_at ? formatDate(data.updated_at) : '-'} />
      </div>
    </ReportSection>
  )
}
