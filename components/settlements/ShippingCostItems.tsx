'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { computeVat, groupSubtotal, type VatMode } from '@/lib/calculations/interim'
import { toCostItem } from '@/lib/utils/costRows'
import { formatNumberForInput, parseNumberInput } from '@/lib/utils/format'

export type { CostRow } from '@/types/settlement'
import type { CostRow } from '@/types/settlement'

export const EMPTY_COST_ROW: CostRow = {
  item_name: '', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0', is_import_vat: false,
  is_duty: false,
}

const row = (item_name: string): CostRow => ({ ...EMPTY_COST_ROW, item_name })

export const DEFAULT_SHIPPING: CostRow[] = [
  row('해상운임'),
  row('터미널 처리비(THC)'),
  row('서류발급비(D/O Fee)'),
  row('내륙운송비'),
  row('기타운임'),
]

interface Props {
  rows: CostRow[]
  onChange: (rows: CostRow[]) => void
  isLocked: boolean
  hint?: React.ReactNode
  /** exclusive 면 행별 부가세 칸 대신 수입부가세 표시를 쓴다 (부가세는 공급가 전액 10%) */
  vatMode?: VatMode
  /**
   * 통관 그룹인가. 부가세 · 수입부가세 · 관세 세 체크를 노출하고 소계를 vat 포함으로 보인다
   * (담당자 2026-09-22 — 통관서류 총액과 바로 맞춰 보도록).
   */
  allowImportVat?: boolean
}

export function CostItemsGroup({
  title, rows, onChange, isLocked, hint, vatMode = 'exclusive', allowImportVat = false,
}: Props & { title: string }) {
  const exclusive = vatMode === 'exclusive'

  function upd(i: number, field: keyof CostRow, value: string | boolean) {
    onChange(rows.map((r, j) => {
      if (j !== i) return r
      const next = { ...r, [field]: value }
      if (field === 'amount_krw' && next.is_vat_taxable)
        next.vat_amount_krw = String(computeVat(parseFloat(String(value)) || 0))
      if (field === 'is_vat_taxable')
        next.vat_amount_krw = value ? String(computeVat(parseFloat(r.amount_krw) || 0)) : '0'
      // 셋은 한 행에 하나만 선다 — 수입부가세·관세가 겹치면 공급가에서 두 번 빠지고,
      // 세금 행(수입부가세·관세)에는 부가세가 다시 붙지 않는다.
      if (field === 'is_import_vat' && value) { next.is_duty = false; next.is_vat_taxable = false; next.vat_amount_krw = '0' }
      if (field === 'is_duty' && value) { next.is_import_vat = false; next.is_vat_taxable = false; next.vat_amount_krw = '0' }
      if (field === 'is_vat_taxable' && value) { next.is_import_vat = false; next.is_duty = false }
      return next
    }))
  }

  const sub = groupSubtotal(rows.map(toCostItem))
  // 통관 그룹(신방식)은 국내발생비용 부가세를 더한 vat 포함 소계, 운임 그룹은 vat 제외 소계다.
  const customs = exclusive && allowImportVat

  // 항목명 / 금액 / (부가세·수입부가세·관세 체크 또는 부가세 칸) / 삭제.
  // Tailwind 는 문자열 조합 클래스를 생성하지 않으므로 완성된 클래스명을 골라 쓴다.
  const nameCls = exclusive ? (allowImportVat ? 'col-span-3' : 'col-span-7') : 'col-span-4'
  const amountCls = exclusive ? (allowImportVat ? 'col-span-3' : 'col-span-4') : 'col-span-3'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {!isLocked && (
          <Button size="sm" variant="outline" onClick={() => onChange([...rows, { ...EMPTY_COST_ROW }])}>
            <Plus className="h-4 w-4 mr-1" />행 추가
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {hint && <div className="text-sm text-slate-600 mb-2">{hint}</div>}
        <div className="grid grid-cols-12 gap-2 text-sm text-muted-foreground px-1 pb-1">
          <span className={nameCls}>항목명</span>
          <span className={amountCls}>금액(원)</span>
          {exclusive
            ? allowImportVat && <>
                <span className="col-span-2 text-center">부가세</span>
                <span className="col-span-2 text-center">수입부가세</span>
                <span className="col-span-1 text-center">관세</span>
              </>
            : <>
                <span className="col-span-2 text-center">부가세</span>
                <span className="col-span-2">부가세(원)</span>
              </>}
          <span className="col-span-1" />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center mb-1">
            <Input className={`${nameCls} h-7 text-sm`} value={r.item_name}
              onChange={(e) => upd(i, 'item_name', e.target.value)} disabled={isLocked} />
            <Input className={`${amountCls} h-7 text-sm tabular-nums`} inputMode="decimal"
              value={formatNumberForInput(r.amount_krw)}
              onChange={(e) => upd(i, 'amount_krw', parseNumberInput(e.target.value))} disabled={isLocked} />
            {exclusive ? (
              allowImportVat && (
                <>
                  <div className="col-span-2 flex justify-center">
                    <input type="checkbox" checked={r.is_vat_taxable}
                      onChange={(e) => upd(i, 'is_vat_taxable', e.target.checked)}
                      disabled={isLocked} className="h-4 w-4"
                      aria-label={`${r.item_name || '항목'} 부가세 과세`} />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <input type="checkbox" checked={r.is_import_vat}
                      onChange={(e) => upd(i, 'is_import_vat', e.target.checked)}
                      disabled={isLocked} className="h-4 w-4"
                      aria-label={`${r.item_name || '항목'} 수입부가세`} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input type="checkbox" checked={r.is_duty}
                      onChange={(e) => upd(i, 'is_duty', e.target.checked)}
                      disabled={isLocked} className="h-4 w-4"
                      aria-label={`${r.item_name || '항목'} 관세`} />
                  </div>
                </>
              )
            ) : (
              <>
                <div className="col-span-2 flex justify-center">
                  <input type="checkbox" checked={r.is_vat_taxable}
                    onChange={(e) => upd(i, 'is_vat_taxable', e.target.checked)} disabled={isLocked} className="h-4 w-4" />
                </div>
                <Input className="col-span-2 h-7 text-sm tabular-nums" inputMode="decimal"
                  value={r.is_vat_taxable ? formatNumberForInput(computeVat(parseFloat(r.amount_krw) || 0)) : formatNumberForInput(r.vat_amount_krw)}
                  readOnly={r.is_vat_taxable}
                  onChange={(e) => upd(i, 'vat_amount_krw', parseNumberInput(e.target.value))} disabled={isLocked} />
              </>
            )}
            {!isLocked && (
              <Button variant="ghost" size="icon" className="col-span-1 h-7 w-7 text-destructive"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex justify-between gap-3 pt-2 text-sm font-semibold border-t mt-1">
          <span className="shrink-0">
            {!exclusive ? '소계' : customs ? '소계 (vat 포함)' : '소계 (vat 제외)'}
          </span>
          <span className="tabular-nums text-right">
            {(customs ? sub.withVatKrw : sub.amountKrw).toLocaleString('ko-KR')}원
            {customs
              ? (sub.itemVatKrw > 0 || sub.importVatKrw > 0 || sub.dutyKrw > 0) && (
                  <span className="block font-normal text-muted-foreground">
                    공급가에서 제외
                    {sub.itemVatKrw > 0 && ` · 국내발생비용 부가세 ${sub.itemVatKrw.toLocaleString('ko-KR')}원`}
                    {sub.importVatKrw > 0 && ` · 수입부가세 ${sub.importVatKrw.toLocaleString('ko-KR')}원`}
                    {sub.dutyKrw > 0 && ` · 관세 ${sub.dutyKrw.toLocaleString('ko-KR')}원 — 부가세를 매긴 뒤 합계에 더한다`}
                  </span>
                )
              : !exclusive && ` (VAT ${sub.itemVatKrw.toLocaleString('ko-KR')}원)`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ShippingCostItems(props: Props) {
  return <CostItemsGroup title="그룹 A: 해상운임 세부 내역" {...props} />
}
