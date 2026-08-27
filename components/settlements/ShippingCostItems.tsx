'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { computeVat, type VatMode } from '@/lib/calculations/interim'
import { formatNumberForInput, parseNumberInput } from '@/lib/utils/format'

export type { CostRow } from '@/types/settlement'
import type { CostRow } from '@/types/settlement'

export const EMPTY_COST_ROW: CostRow = {
  item_name: '', amount_krw: '', is_vat_taxable: false, vat_amount_krw: '0', is_import_vat: false,
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
  hint?: string
  /** exclusive 면 행별 부가세 칸 대신 수입부가세 표시를 쓴다 (부가세는 공급가 전액 10%) */
  vatMode?: VatMode
  /** 수입부가세 체크를 노출할지 — 통관 그룹에서만 의미가 있다 */
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
      return next
    }))
  }

  const subtotal = rows.reduce((s, r) => s + (parseFloat(r.amount_krw) || 0), 0)
  const importVatTotal = rows.reduce((s, r) => s + (r.is_import_vat ? (parseFloat(r.amount_krw) || 0) : 0), 0)
  const vatTotal = rows.reduce((s, r) =>
    s + (r.is_vat_taxable ? computeVat(parseFloat(r.amount_krw) || 0) : (parseFloat(r.vat_amount_krw) || 0)), 0)

  // 항목명 / 금액 / (부가세 칸 또는 수입부가세) / 삭제.
  // Tailwind 는 문자열 조합 클래스를 생성하지 않으므로 완성된 클래스명을 골라 쓴다.
  const nameCls = exclusive ? (allowImportVat ? 'col-span-5' : 'col-span-7') : 'col-span-4'
  const amountCls = exclusive ? 'col-span-4' : 'col-span-3'

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
        {hint && <p className="text-xs text-blue-600 mb-2">{hint}</p>}
        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1 pb-1">
          <span className={nameCls}>항목명</span>
          <span className={amountCls}>금액(원)</span>
          {exclusive
            ? allowImportVat && <span className="col-span-2 text-center">수입부가세</span>
            : <>
                <span className="col-span-2 text-center">부가세</span>
                <span className="col-span-2">부가세(원)</span>
              </>}
          <span className="col-span-1" />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center mb-1">
            <Input className={`${nameCls} h-7 text-xs`} value={r.item_name}
              onChange={(e) => upd(i, 'item_name', e.target.value)} disabled={isLocked} />
            <Input className={`${amountCls} h-7 text-xs font-mono`} inputMode="decimal"
              value={formatNumberForInput(r.amount_krw)}
              onChange={(e) => upd(i, 'amount_krw', parseNumberInput(e.target.value))} disabled={isLocked} />
            {exclusive ? (
              allowImportVat && (
                <div className="col-span-2 flex justify-center">
                  <input type="checkbox" checked={r.is_import_vat}
                    onChange={(e) => upd(i, 'is_import_vat', e.target.checked)}
                    disabled={isLocked} className="h-4 w-4"
                    aria-label={`${r.item_name || '항목'} 수입부가세`} />
                </div>
              )
            ) : (
              <>
                <div className="col-span-2 flex justify-center">
                  <input type="checkbox" checked={r.is_vat_taxable}
                    onChange={(e) => upd(i, 'is_vat_taxable', e.target.checked)} disabled={isLocked} className="h-4 w-4" />
                </div>
                <Input className="col-span-2 h-7 text-xs font-mono" inputMode="decimal"
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
        <div className="flex justify-between pt-2 text-sm font-semibold border-t mt-1">
          <span>소계</span>
          <span className="font-mono">
            {subtotal.toLocaleString('ko-KR')}원
            {exclusive
              ? importVatTotal > 0 && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    (수입부가세 {importVatTotal.toLocaleString('ko-KR')}원 — 공급가에서 제외)
                  </span>
                )
              : ` (VAT ${vatTotal.toLocaleString('ko-KR')}원)`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function ShippingCostItems(props: Props) {
  return <CostItemsGroup title="그룹 A: 해상운임 세부 내역" {...props} />
}
