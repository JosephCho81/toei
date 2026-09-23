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
  /** 관세 — 공급가 밖에서 합계에만 얹힌다 */
  is_duty?: boolean
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
    <TableRow className="bg-slate-50">
      <TableCell colSpan={3} className="text-sm font-semibold text-slate-700 py-1.5">{label}</TableCell>
    </TableRow>
  )
}

function ItemRow({ item, exclusive }: { item: CostItem; exclusive: boolean }) {
  const note = exclusive
    ? (item.is_import_vat ? '통관서류의 부가가치세 — 공급가에서 제외'
        : item.is_duty ? '관세 — 공급가에서 제외'
        : item.is_vat_taxable && item.group_type !== 'shipping' ? '부가세 과세 (국내발생비용)'
        : '실비 청구액')
    : (item.vat_amount_krw > 0
        ? `공급가 ${item.amount_krw.toLocaleString('ko-KR')} (부가세 ${item.vat_amount_krw.toLocaleString('ko-KR')} 별도)`
        : '실비 청구액')
  return (
    <TableRow className="bg-muted/20">
      <TableCell className="pl-6 text-muted-foreground text-sm">{item.item_name}</TableCell>
      <TableCell className="text-sm text-gray-400 tabular-nums">{note}</TableCell>
      <TableCell className={`text-right tabular-nums text-sm ${exclusive && item.is_import_vat ? 'text-gray-400 line-through' : ''}`}>
        {krw(item.amount_krw)}
      </TableCell>
    </TableRow>
  )
}

function GroupSubtotalRow({ label, count, total, vatKrw = 0 }: { label: string; count: number; total: number; vatKrw?: number }) {
  return (
    <TableRow className="bg-muted/40 border-t border-dashed">
      <TableCell className="pl-6 text-sm font-semibold">{label}</TableCell>
      <TableCell className="text-sm text-gray-400 tabular-nums">
        위 {count}개 항목 합계{vatKrw !== 0 && ` + 국내발생비용 부가세 ${vatKrw.toLocaleString('ko-KR')}`}
      </TableCell>
      <TableCell className="text-right tabular-nums text-sm font-semibold">{krw(total)}</TableCell>
    </TableRow>
  )
}

export function ReportInterimSection({ data }: { data: InterimCostData }) {
  const {
    exclusive, customsTotal, customsWithVatKrw, customsItemVatKrw, deductVatKrw, supplyKrw, outputVatKrw, dutyKrw, subTotal,
    showConfirmed, confirmedDiff, diffIsRounding,
    importFormula, vatFormula, supplyFormula, subTotalFormula,
  } = interimSummary(data)

  return (
    <ReportSection title="III. 중간정산 내역">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-slate-700 font-bold w-[30%]">항목</TableHead>
            <TableHead className="text-slate-700 font-bold">계산식</TableHead>
            <TableHead className="text-right text-slate-700 font-bold w-[22%]">금액 (KRW)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">수입원가 (마진포함)</TableCell>
            <TableCell className="text-muted-foreground text-sm tabular-nums leading-relaxed">
              {importFormula}
            </TableCell>
            <TableCell className="text-right tabular-nums">{krw(data.importAmountKrw)}</TableCell>
          </TableRow>

          {data.shippingItems.length > 0 && (
            <>
              <GroupHeaderRow label="그룹 A: 해상운임 세부내역" />
              {data.shippingItems.map((item, i) => <ItemRow key={`sh-${i}`} item={item} exclusive={exclusive} />)}
              <GroupSubtotalRow label={exclusive ? '해상운임 소계 (vat 제외)' : '해상운임 소계'}
                count={data.shippingItems.length}
                total={data.shippingItems.reduce((s, r) => s + r.amount_krw, 0)} />
            </>
          )}

          {data.customsItems.length > 0 && (
            <>
              <GroupHeaderRow label="그룹 B: 통관 세부내역" />
              {data.customsItems.map((item, i) => <ItemRow key={`cu-${i}`} item={item} exclusive={exclusive} />)}
              <GroupSubtotalRow label={exclusive ? '통관 소계 (vat 포함)' : '통관비용 소계'}
                count={data.customsItems.length}
                total={exclusive ? customsWithVatKrw : customsTotal} vatKrw={customsItemVatKrw} />
            </>
          )}

          {exclusive ? (
            <>
              {deductVatKrw !== 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground text-sm">부가세 (수입부가세 + 국내발생비용 부가세)</TableCell>
                  <TableCell className="text-sm text-gray-400">공급가에서 제외</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">− {krw(deductVatKrw)}</TableCell>
                </TableRow>
              )}
              {dutyKrw !== 0 && (
                <TableRow>
                  <TableCell className="text-muted-foreground text-sm">관세</TableCell>
                  <TableCell className="text-sm text-gray-400">공급가에서 빼고 부가세를 매긴 뒤 합계에 더한다</TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">− {krw(dutyKrw)}</TableCell>
                </TableRow>
              )}
              <TableRow className="border-t">
                <TableCell className="font-medium">공급가 (부가세 별도)</TableCell>
                <TableCell className="text-sm text-gray-400 tabular-nums">{supplyFormula}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{krw(supplyKrw)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">부가세 (공급가 × 10%)</TableCell>
                <TableCell className="text-sm text-gray-400 tabular-nums">
                  공급가 {supplyKrw.toLocaleString('ko-KR')} x 10%
                </TableCell>
                <TableCell className="text-right tabular-nums">{krw(outputVatKrw)}</TableCell>
              </TableRow>
              {dutyKrw !== 0 && (
                <TableRow>
                  <TableCell className="font-medium">관세 (부가세 없음)</TableCell>
                  <TableCell className="text-sm text-gray-400">합계에 그대로 더한다</TableCell>
                  <TableCell className="text-right tabular-nums">{krw(dutyKrw)}</TableCell>
                </TableRow>
              )}
            </>
          ) : data.vatAmountKrw > 0 && (
            <TableRow>
              <TableCell className="font-medium">부가세 (운송·용역분)</TableCell>
              <TableCell className="text-sm text-gray-400 tabular-nums">
                {vatFormula} = {data.vatAmountKrw.toLocaleString('ko-KR')}
              </TableCell>
              <TableCell className="text-right tabular-nums">{krw(data.vatAmountKrw)}</TableCell>
            </TableRow>
          )}

          {showConfirmed ? (
            <>
              <TableRow className="bg-muted/10 border-t border-dashed">
                <TableCell className="text-muted-foreground text-sm">
                  {exclusive ? '합계' : '소계'} <span className="text-sm">(시스템 계산)</span>
                </TableCell>
                <TableCell className="text-sm text-gray-400 tabular-nums">{subTotalFormula}</TableCell>
                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{krw(subTotal)}</TableCell>
              </TableRow>
              <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-200">
                <TableCell className="text-slate-700 text-base">중간정산 확정금액{exclusive ? (dutyKrw !== 0 ? ' (공급가+부가세+관세)' : ' (공급가+부가세)') : ''}</TableCell>
                <TableCell className="text-sm">
                  {Math.abs(confirmedDiff) > 0 && (
                    <div className={diffIsRounding ? 'text-muted-foreground' : 'text-slate-600'}>
                      {diffIsRounding
                        ? `※ 100원 단위 절사 (소계 대비 ${confirmedDiff.toLocaleString('ko-KR')}원)`
                        : `※ 시스템 대비 ${confirmedDiff > 0 ? '+' : ''}${confirmedDiff.toLocaleString('ko-KR')}원 차이`}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-700 text-base">
                  {krw(data.confirmedAmountKrw!)}
                </TableCell>
              </TableRow>
            </>
          ) : (
            <TableRow className="bg-slate-50 font-semibold border-t-2 border-slate-200">
              <TableCell className="text-slate-700">{exclusive ? '합계' : '소계'}</TableCell>
              <TableCell className="text-sm text-gray-400 tabular-nums">{subTotalFormula}</TableCell>
              <TableCell className="text-right tabular-nums text-slate-700">{krw(subTotal)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {data.interimDirection && (
        <div className="mt-2 inline-flex items-center bg-slate-100 text-slate-700 rounded px-3 py-1">
          <span className="text-sm font-semibold">{data.interimDirection}</span>
        </div>
      )}
    </ReportSection>
  )
}
