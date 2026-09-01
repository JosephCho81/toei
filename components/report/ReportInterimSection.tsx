import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ReportSection } from './ReportSection'
import { interimSummary } from './interimSummary'

interface CostItem {
  item_name: string
  amount_krw: number
  is_vat_taxable: boolean
  vat_amount_krw: number
  is_import_vat: boolean
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
  /** 'exclusive' = 수입부가세를 뺀 공급가 + 매출부가세 10%. 'inclusive' = 구방식 */
  vatMode?: 'inclusive' | 'exclusive'
  /** exclusive 확정값. 없으면 항목에서 재계산해 보여준다. */
  supplyAmountKrw?: number | null
  outputVatKrw?: number | null
  confirmedAmountKrw?: number | null
  interimDirection?: string | null
}

const krw = (n: number) => `${n.toLocaleString('ko-KR')}원`

function GroupHeaderRow({ label }: { label: string }) {
  return (
    <TableRow className="bg-green-50/60">
      <TableCell colSpan={3} className="text-xs font-semibold text-green-800 py-1.5">{label}</TableCell>
    </TableRow>
  )
}

function ItemRow({ item, exclusive }: { item: CostItem; exclusive: boolean }) {
  const note = exclusive
    ? (item.is_import_vat ? '세관 납부 수입부가세 — 매입세액공제분이라 공급가에서 제외' : '실비 청구액')
    : (item.vat_amount_krw > 0
        ? `공급가 ${item.amount_krw.toLocaleString('ko-KR')} (부가세 ${item.vat_amount_krw.toLocaleString('ko-KR')} 별도)`
        : '실비 청구액')
  return (
    <TableRow className="bg-muted/20">
      <TableCell className="pl-6 text-muted-foreground text-sm">{item.item_name}</TableCell>
      <TableCell className="text-xs text-gray-400 font-mono">{note}</TableCell>
      <TableCell className={`text-right font-mono text-sm ${exclusive && item.is_import_vat ? 'text-gray-400 line-through' : ''}`}>
        {krw(item.amount_krw)}
      </TableCell>
    </TableRow>
  )
}

function GroupSubtotalRow({ label, items }: { label: string; items: CostItem[] }) {
  const total = items.reduce((s, r) => s + r.amount_krw, 0)
  return (
    <TableRow className="bg-muted/40 border-t border-dashed">
      <TableCell className="pl-6 text-sm font-semibold">{label}</TableCell>
      <TableCell className="text-xs text-gray-400">위 {items.length}개 항목 합계</TableCell>
      <TableCell className="text-right font-mono text-sm font-semibold">{krw(total)}</TableCell>
    </TableRow>
  )
}

export function ReportInterimSection({ data }: { data: InterimCostData }) {
  const {
    exclusive, shippingTotal, customsTotal, supplyKrw, outputVatKrw, subTotal,
    showConfirmed, confirmedDiff, diffIsRounding,
    importFormula, vatFormula, supplyFormula, subTotalFormula,
  } = interimSummary(data)

  return (
    <ReportSection title="III. 중간정산 내역">
      <Table>
        <TableHeader>
          <TableRow className="bg-green-50">
            <TableHead className="text-green-800 font-bold w-[30%]">항목</TableHead>
            <TableHead className="text-green-800 font-bold">계산식</TableHead>
            <TableHead className="text-right text-green-800 font-bold w-[22%]">금액 (KRW)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">수입금액 (원화환산)</TableCell>
            <TableCell className="text-muted-foreground text-xs font-mono leading-relaxed">
              {importFormula}
            </TableCell>
            <TableCell className="text-right font-mono">{krw(data.importAmountKrw)}</TableCell>
          </TableRow>

          {data.shippingItems.length > 0 && (
            <>
              <GroupHeaderRow label="그룹 A: 해상운임 세부내역" />
              {data.shippingItems.map((item, i) => <ItemRow key={`sh-${i}`} item={item} exclusive={exclusive} />)}
              <GroupSubtotalRow label="해상운임 소계" items={data.shippingItems} />
            </>
          )}

          {data.customsItems.length > 0 && (
            <>
              <GroupHeaderRow label="그룹 B: 통관 세부내역" />
              {data.customsItems.map((item, i) => <ItemRow key={`cu-${i}`} item={item} exclusive={exclusive} />)}
              <GroupSubtotalRow label="통관비용 소계" items={data.customsItems} />
            </>
          )}

          {exclusive ? (
            <>
              <TableRow className="border-t">
                <TableCell className="font-medium">공급가 (부가세 별도)</TableCell>
                <TableCell className="text-xs text-gray-400 font-mono">{supplyFormula}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{krw(supplyKrw)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">부가세</TableCell>
                <TableCell className="text-xs text-gray-400 font-mono">
                  공급가 {supplyKrw.toLocaleString('ko-KR')} x 10%
                </TableCell>
                <TableCell className="text-right font-mono">{krw(outputVatKrw)}</TableCell>
              </TableRow>
            </>
          ) : data.vatAmountKrw > 0 && (
            <TableRow>
              <TableCell className="font-medium">부가세 (운송·용역분)</TableCell>
              <TableCell className="text-xs text-gray-400 font-mono">
                {vatFormula} = {data.vatAmountKrw.toLocaleString('ko-KR')}
              </TableCell>
              <TableCell className="text-right font-mono">{krw(data.vatAmountKrw)}</TableCell>
            </TableRow>
          )}

          {showConfirmed ? (
            <>
              <TableRow className="bg-muted/10 border-t border-dashed">
                <TableCell className="text-muted-foreground text-sm">
                  소계 <span className="text-xs">(시스템 계산)</span>
                </TableCell>
                <TableCell className="text-xs text-gray-400 font-mono">{subTotalFormula}</TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">{krw(subTotal)}</TableCell>
              </TableRow>
              <TableRow className="bg-green-100 font-bold border-t-2 border-green-200">
                <TableCell className="text-green-800 text-base">중간정산 확정금액{exclusive ? ' (공급가+부가세)' : ''}</TableCell>
                <TableCell className="text-xs">
                  {Math.abs(confirmedDiff) > 0 && (
                    <div className={diffIsRounding ? 'text-muted-foreground' : 'text-orange-600'}>
                      {diffIsRounding
                        ? `※ 100원 단위 절사 (소계 대비 ${confirmedDiff.toLocaleString('ko-KR')}원)`
                        : `※ 시스템 대비 ${confirmedDiff > 0 ? '+' : ''}${confirmedDiff.toLocaleString('ko-KR')}원 차이`}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-green-800 text-base">
                  {krw(data.confirmedAmountKrw!)}
                </TableCell>
              </TableRow>
            </>
          ) : (
            <TableRow className="bg-green-50 font-semibold border-t-2 border-green-200">
              <TableCell className="text-green-800">소계</TableCell>
              <TableCell className="text-xs text-gray-400 font-mono">{subTotalFormula}</TableCell>
              <TableCell className="text-right font-mono text-green-800">{krw(subTotal)}</TableCell>
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
