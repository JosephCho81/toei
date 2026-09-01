'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { itemsTotalUsd, compareAmount } from '@/lib/calculations/itemTotals'
import {
  blankCheckRow, blankItemRow, findBadQuantity, loadTransactionItems, saveTransactionItems,
  type CheckRow, type ItemEditRow,
} from '@/lib/data/transactionItems'
import { useProducts } from '@/lib/products/useProducts'
import { applyProduct, nextRowValues } from '@/lib/products/rowFill'
import { useGridNav } from '@/lib/hooks/useGridNav'
import { ItemDatalists, ITEM_DATALIST, listIdsForSpec } from './ItemDatalists'
import { AmountCheckRow, AmountCheckNoteRow, usdLabel } from './AmountCheckRows'
import { ItemEditRowView, TEXT_COLS, COL_LABELS } from './ItemEditRowView'

export function ItemsEditTable({ transactionId, isLocked }: {
  transactionId: string
  isLocked: boolean
}) {
  const [supabase] = useState(createClient)
  const { products } = useProducts()
  const { cellProps } = useGridNav('items-edit')
  const [rows, setRows] = useState<ItemEditRow[]>([])
  const [checks, setChecks] = useState<CheckRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    loadTransactionItems(supabase, transactionId).then((data) => {
      if (!active) return
      setRows(data.rows)
      setChecks(data.checks)
      setLoaded(true)
    })
    return () => { active = false }
  }, [supabase, transactionId])

  function upd(key: string, field: keyof Omit<ItemEditRow, '_key' | 'id'>, value: string) {
    setRows((p) => p.map((r) => {
      if (r._key !== key) return r
      const next = { ...r, [field]: value }
      // 품목명을 마스터에서 고르면 재질·색상·단위를 자동으로 채운다
      return field === 'spec' ? { ...next, ...applyProduct(next, products) } : next
    }))
    setSaved(false)
  }

  function updCheck(key: string, field: keyof Omit<CheckRow, '_key' | 'id'>, value: string) {
    setChecks((p) => p.map((c) => c._key === key ? { ...c, [field]: value } : c))
    setSaved(false)
  }

  async function save() {
    const badQty = findBadQuantity(rows)
    if (badQty) {
      toast.error(`수량은 0 이상 정수만 입력할 수 있습니다: '${badQty.spec || '품목'}' 의 '${badQty.quantity}'`)
      return
    }
    setSaving(true)
    const errors = await saveTransactionItems(supabase, transactionId, rows, checks)
    setSaving(false)
    if (errors.length) {
      toast.error(`저장 실패: ${errors[0]}`)
      return
    }
    setSaved(true)
    toast.success('저장했습니다')
  }

  const totalQty = rows.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0)
  const totalUsd = itemsTotalUsd(rows)
  const diffs = checks.map((c) => ({ check: c, diff: compareAmount(totalUsd, c.amount_usd) }))
  const mismatches = diffs.filter((d) => d.diff.status === 'mismatch' || d.diff.status === 'minor')

  if (!loaded) return null

  /** 품목을 고르면 그 품목에 등록된 사이즈·색상만 목록에 뜬다 */
  const datalistFor = (spec: string): Record<typeof TEXT_COLS[number], string> => {
    const lists = listIdsForSpec(products, spec)
    return {
      spec: ITEM_DATALIST.spec,
      glove_type: ITEM_DATALIST.gloveType,
      color: lists.color,
      size: lists.size,
    }
  }
  const totalCols = isLocked ? 8 : 9

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">품목 명세</CardTitle>
        {!isLocked && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              onClick={() => { setRows((p) => [...p, { ...blankItemRow(), ...nextRowValues(p, products) }]); setSaved(false) }}>
              <Plus className="h-4 w-4 mr-1" />행 추가
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => { setChecks((p) => [...p, blankCheckRow()]); setSaved(false) }}>
              <Plus className="h-4 w-4 mr-1" />대조금액 추가
            </Button>
            <Button size="sm" onClick={save} disabled={saving || saved}>
              {saved ? '저장됨' : saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ItemDatalists products={products} />
        {mismatches.length > 0 && (
          <div className="mx-4 mb-2 rounded-md border border-red-200 bg-red-50/70 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            품목 합계와 다른 입력금액이 {mismatches.length}건 있습니다. 차액 사유를 확인하세요.
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COL_LABELS.map((l) => <TableHead key={l}>{l}</TableHead>)}
                <TableHead className="text-right">단가(USD)</TableHead>
                <TableHead className="text-right">수량</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="text-right">소계</TableHead>
                {!isLocked && <TableHead className="w-8" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, rowIndex) => (
                <ItemEditRowView
                  key={r._key} row={r} rowIndex={rowIndex} isLocked={isLocked}
                  datalists={datalistFor(r.spec)} cellProps={cellProps}
                  onUpdate={(field, value) => upd(r._key, field, value)}
                  onRemove={() => { setRows((p) => p.filter((x) => x._key !== r._key)); setSaved(false) }}
                  canRemove={rows.length > 1}
                />
              ))}
              {rows.length > 0 && (
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={5} className="text-right text-sm">합계</TableCell>
                  <TableCell className="text-right text-sm">{totalQty.toLocaleString('ko-KR')}</TableCell>
                  <TableCell />
                  <TableCell className="text-right text-sm pr-3">{usdLabel(totalUsd)}</TableCell>
                  {!isLocked && <TableCell />}
                </TableRow>
              )}

              {diffs.map(({ check, diff }) => (
                <AmountCheckRow
                  key={check._key} check={check} diff={diff} isLocked={isLocked}
                  onUpdate={(field, value) => updCheck(check._key, field, value)}
                  onRemove={() => { setChecks((p) => p.filter((x) => x._key !== check._key)); setSaved(false) }}
                />
              ))}
              {diffs.map(({ check, diff }) => (
                <AmountCheckNoteRow
                  key={`${check._key}-note`} check={check} diff={diff}
                  isLocked={isLocked} colSpan={totalCols}
                  onUpdate={(field, value) => updCheck(check._key, field, value)}
                />
              ))}

              {rows.length === 0 && checks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={totalCols} className="text-center text-muted-foreground py-6 text-sm">
                    품목 데이터가 없습니다.{!isLocked && ' 행 추가 버튼을 눌러 추가하세요.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {!isLocked && (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            ↑·↓ 로 위아래 칸 이동, Tab 으로 오른쪽 이동. 품목을 고르면 종류·색상·단위가 자동 입력되고, 행 추가 시 사이즈가 순서대로 채워집니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
