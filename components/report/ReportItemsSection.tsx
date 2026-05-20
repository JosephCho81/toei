import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ReportSection } from './ReportSection'

interface Item {
  id: string
  spec: string | null
  glove_type: string | null
  color: string | null
  size: string | null
  unit_price_usd: number | null
  quantity: number | null
  unit: string | null
}

interface Props {
  items: Item[]
  importAmountUsd: number | null
  marginRatePct: number | null
}

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ReportItemsSection({ items, importAmountUsd, marginRatePct }: Props) {
  if (!items.length) return null

  const totalQty = items.reduce((s, r) => s + (r.quantity ?? 0), 0)
  const totalUsd = items.reduce((s, r) => s + (r.unit_price_usd ?? 0) * (r.quantity ?? 0), 0)
  const salesAmountUsd = importAmountUsd != null && marginRatePct != null
    ? importAmountUsd * (1 + marginRatePct / 100) : null

  return (
    <ReportSection title="II. 수입 품목 내역">
      <div className="overflow-x-auto mb-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사양</TableHead><TableHead>종류</TableHead>
              <TableHead>색상</TableHead><TableHead>사이즈</TableHead>
              <TableHead className="text-right">단가(USD)</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead>단위</TableHead>
              <TableHead className="text-right">소계(USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((r) => {
              const sub = (r.unit_price_usd ?? 0) * (r.quantity ?? 0)
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{r.spec ?? '-'}</TableCell>
                  <TableCell className="text-sm">{r.glove_type ?? '-'}</TableCell>
                  <TableCell className="text-sm">{r.color ?? '-'}</TableCell>
                  <TableCell className="text-sm">{r.size ?? '-'}</TableCell>
                  <TableCell className="text-right text-sm">
                    {r.unit_price_usd != null ? usd(r.unit_price_usd) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-sm">{r.quantity?.toLocaleString('ko-KR') ?? '-'}</TableCell>
                  <TableCell className="text-sm">{r.unit ?? 'DZ'}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{usd(sub)}</TableCell>
                </TableRow>
              )
            })}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={5} className="text-right text-sm">합계</TableCell>
              <TableCell className="text-right text-sm">{totalQty.toLocaleString('ko-KR')}</TableCell>
              <TableCell />
              <TableCell className="text-right text-sm">{usd(totalUsd)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {salesAmountUsd != null && (
        <div className="flex justify-between text-sm font-semibold bg-muted/30 px-3 py-2 rounded-md">
          <span>총판매금액 (수입금액 × (1 + {marginRatePct}%))</span>
          <span className="font-mono">{usd(salesAmountUsd)}</span>
        </div>
      )}
    </ReportSection>
  )
}
