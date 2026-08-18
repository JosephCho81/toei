'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { calculateClosing, type RoundingPolicy } from '@/lib/calculations/closing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MemoField } from '@/components/ui/MemoField'
import { aggregateForwardingQuotes } from '@/lib/utils/forwarding'
import { fetchTransactionBase, fetchInterimSettlement, fetchForwardingQuotes } from '@/lib/data/queries'
import { ClosingFxCard } from '@/components/settlements/ClosingFxCard'
import { ClosingLcFeeCard } from '@/components/settlements/ClosingLcFeeCard'
import { ClosingCostCard } from '@/components/settlements/ClosingCostCard'
import { ClosingSummaryCard } from '@/components/settlements/ClosingSummaryCard'

interface FeeRow {
  id?: string
  item_name: string
  amount_krw: string
}

interface CostRow {
  id?: string
  item_name: string
  amount_krw: string
  includes_vat: boolean
}

export default function ClosingSettlementPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [transaction, setTransaction] = useState<{
    import_amount_usd: number | null
    customs_exchange_rate: number | null
  } | null>(null)
  const [interimSummary, setInterimSummary] = useState<{
    confirmed_amount_krw: number | null
    customs_exchange_rate: number | null
    is_locked: boolean
    updated_at: string | null
  } | null>(null)
  const [settlementId, setSettlementId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const [closingDate, setClosingDate] = useState('')
  const [bokRate, setBokRate] = useState('')
  const [bokLoading, setBokLoading] = useState(false)
  const [lcPayment, setLcPayment] = useState('')
  const [fxBurdenA1Pct, setFxBurdenA1Pct] = useState(50)
  const [roundingPolicy, setRoundingPolicy] = useState<RoundingPolicy>('floor_100')

  const [lcFeeRows, setLcFeeRows] = useState<FeeRow[]>([
    { item_name: '개설', amount_krw: '' },
    { item_name: '기한연장', amount_krw: '0' },
    { item_name: '조건변경', amount_krw: '0' },
    { item_name: '인수', amount_krw: '' },
    { item_name: '기타', amount_krw: '0' },
    { item_name: '환급', amount_krw: '0' },
  ])
  const [closingCostRows, setClosingCostRows] = useState<CostRow[]>([
    { item_name: '통관보수료', amount_krw: '0', includes_vat: false },
    { item_name: '검역수수료', amount_krw: '0', includes_vat: false },
    { item_name: '운송추가운임', amount_krw: '0', includes_vat: true },
  ])
  const [customsDetailItems, setCustomsDetailItems] = useState<{ item_name: string; amount_krw: number }[]>([])
  const [forwardingQuotes, setForwardingQuotes] = useState<{ forwarder_name: string; quote_amount_krw: number | null; actual_amount_krw: number | null }[]>([])
  // null이면 시스템 계산값을 그대로 따라간다. 담당자가 직접 입력했거나 DB에 저장된 확정금액이 있을 때만 문자열.
  const [confirmedOverride, setConfirmedOverride] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [t, interim, fwdRows] = await Promise.all([
        fetchTransactionBase(supabase, id),
        fetchInterimSettlement(supabase, id),
        fetchForwardingQuotes(supabase, id),
      ])
      setTransaction(t)
      if (interim) setInterimSummary(interim as typeof interimSummary)
      setForwardingQuotes(aggregateForwardingQuotes(fwdRows).map(q => ({
        forwarder_name: q.forwarderName,
        quote_amount_krw: q.quoteAmountKrw || null,
        actual_amount_krw: q.actualAmountKrw || null,
      })))

      if (interim?.id) {
        const { data: costItems } = await supabase
          .from('interim_cost_items')
          .select('item_name,amount_krw')
          .eq('interim_settlement_id', interim.id)
          .eq('group_type', 'customs')
          .order('sort_order')
        setCustomsDetailItems((costItems ?? []).map((c) => ({ item_name: String(c.item_name ?? ''), amount_krw: Number(c.amount_krw) || 0 })))
      }

      const { data: closing } = await supabase
        .from('closing_settlements')
        .select('*')
        .eq('transaction_id', id)
        .single()

      if (closing) {
        setSettlementId(closing.id)
        setIsLocked(closing.is_locked)
        setClosingDate(closing.closing_date ?? '')
        setBokRate(String(closing.bok_exchange_rate ?? ''))
        setLcPayment(String(closing.lc_payment_total_krw ?? ''))
        setFxBurdenA1Pct(closing.fx_burden_a1_pct ?? 50)
        setRoundingPolicy(closing.rounding_policy as RoundingPolicy)
        setConfirmedOverride(closing.confirmed_amount_krw != null ? String(closing.confirmed_amount_krw) : null)
        setNotes((closing as Record<string, unknown>).notes as string | null ?? null)

        const { data: fees } = await supabase
          .from('lc_fee_items')
          .select('*')
          .eq('closing_settlement_id', closing.id)
          .order('sort_order')
        if (fees?.length) {
          setLcFeeRows(fees.map((f) => ({ id: f.id, item_name: f.item_name, amount_krw: String(f.amount_krw) })))
        }

        const { data: costs } = await supabase
          .from('closing_cost_items')
          .select('*')
          .eq('closing_settlement_id', closing.id)
          .order('sort_order')
        if (costs?.length) {
          setClosingCostRows(costs.map((c) => ({ id: c.id, item_name: c.item_name, amount_krw: String(c.amount_krw), includes_vat: c.includes_vat })))
        }
      }
    }
    load()
  }, [id])

  async function fetchBokRate() {
    if (!closingDate) return
    setBokLoading(true)
    const dateStr = closingDate.replace(/-/g, '')
    const res = await fetch(`/api/exchange-rate?date=${dateStr}`)
    const data = await res.json()
    if (data.rate) setBokRate(String(data.rate))
    setBokLoading(false)
  }

  const calc = transaction?.import_amount_usd && transaction?.customs_exchange_rate && lcPayment
    ? calculateClosing({
        lcPaymentTotalKrw: parseFloat(lcPayment),
        importAmountUsd: Number(transaction.import_amount_usd),
        customsExchangeRate: Number(transaction.customs_exchange_rate),
        lcFeeItems: lcFeeRows.map((r) => ({ amountKrw: parseFloat(r.amount_krw) || 0 })),
        fxBurdenA1Pct,
        closingCostItems: closingCostRows.map((r) => ({
          amountKrw: parseFloat(r.amount_krw) || 0,
          includesVat: r.includes_vat,
        })),
        roundingPolicy,
        interimConfirmedKrw: interimSummary?.confirmed_amount_krw ?? 0,
      })
    : null

  const systemAmount = calc?.roundedFinalKrw ?? 0
  const confirmedAmount = confirmedOverride ?? (systemAmount !== 0 ? String(systemAmount) : '')

  async function handleSave(lock = false) {
    setSaving(true)
    try {
      const upsertData = {
        transaction_id: id,
        closing_date: closingDate,
        bok_exchange_rate: parseFloat(bokRate) || null,
        lc_payment_total_krw: parseFloat(lcPayment) || null,
        fx_burden_a1_pct: fxBurdenA1Pct,
        rounding_policy: roundingPolicy,
        confirmed_amount_krw: parseFloat(confirmedAmount) || systemAmount,
        is_locked: lock,
      }

      let sid = settlementId
      if (sid) {
        const { error } = await supabase.from('closing_settlements').update(upsertData).eq('id', sid)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('closing_settlements').insert(upsertData).select('id').single()
        if (error) throw error
        sid = data?.id ?? null
        setSettlementId(sid)
      }
      if (!sid) throw new Error('클로징정산 ID를 확인할 수 없습니다.')

      const { error: itemsError } = await supabase.rpc('save_closing_items', {
        p_closing_settlement_id: sid,
        p_lc_fees: lcFeeRows.map((r, i) => ({
          item_name: r.item_name,
          amount_krw: parseFloat(r.amount_krw) || 0,
          sort_order: i,
        })),
        p_costs: closingCostRows.map((r, i) => ({
          item_name: r.item_name,
          amount_krw: parseFloat(r.amount_krw) || 0,
          includes_vat: r.includes_vat,
          sort_order: i,
        })),
      })
      if (itemsError) throw itemsError

      toast.success(lock ? '확정 및 잠금 완료' : '저장 완료')
      if (lock) {
        setIsLocked(true)
        router.push(`/transactions/${id}`)
      }
    } catch (e) {
      toast.error(`저장 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  if (!transaction) return <p className="p-6 text-muted-foreground">로딩 중...</p>

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">클로징정산</h2>
        {isLocked && <Badge variant="outline">🔒 확정</Badge>}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">중간정산 요약</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {interimSummary?.is_locked ? (
            <div className="flex items-center gap-6">
              <div>
                <span className="text-muted-foreground">확정금액</span>
                <p className="font-bold text-lg font-mono">
                  {interimSummary.confirmed_amount_krw?.toLocaleString('ko-KR')}원
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">통관환율</span>
                <p className="font-mono">{interimSummary.customs_exchange_rate?.toLocaleString('ko-KR')}원/$</p>
              </div>
              {interimSummary.updated_at && (
                <div>
                  <span className="text-muted-foreground">정산일</span>
                  <p>{new Date(interimSummary.updated_at).toLocaleDateString('ko-KR')}</p>
                </div>
              )}
              <Badge variant="default" className="text-xs">완료</Badge>
            </div>
          ) : (
            <Badge variant="destructive" className="text-xs">중간정산 미완료</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">클로징 기본 정보</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>클로징일</Label>
            <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} disabled={isLocked} />
          </div>
          <div className="space-y-1">
            <Label>한국은행 고시 환율 (원/$)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.0001"
                value={bokRate}
                onChange={(e) => setBokRate(e.target.value)}
                disabled={isLocked}
                className="font-mono"
              />
              {!isLocked && (
                <Button size="sm" variant="outline" onClick={fetchBokRate} disabled={bokLoading || !closingDate}>
                  {bokLoading ? '조회중' : '자동조회'}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>LC 결제비용 (원)</Label>
            <Input
              type="number"
              value={lcPayment}
              onChange={(e) => setLcPayment(e.target.value)}
              disabled={isLocked}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      <ClosingFxCard
        calc={calc}
        customsExchangeRate={Number(transaction.customs_exchange_rate)}
        lcPayment={lcPayment}
      />

      <ClosingLcFeeCard
        lcFeeRows={lcFeeRows}
        onLcFeeChange={setLcFeeRows}
        isLocked={isLocked}
        calc={calc}
        fxBurdenA1Pct={fxBurdenA1Pct}
        onFxBurdenChange={setFxBurdenA1Pct}
      />

      <ClosingCostCard
        closingCostRows={closingCostRows}
        onCostChange={setClosingCostRows}
        isLocked={isLocked}
        calc={calc}
      />

      <ClosingSummaryCard
        calc={calc}
        roundingPolicy={roundingPolicy}
        onRoundingChange={setRoundingPolicy}
        confirmedAmount={confirmedAmount}
        onConfirmedChange={setConfirmedOverride}
        isLocked={isLocked}
        interimIsLocked={interimSummary?.is_locked ?? false}
      />

      {customsDetailItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">통관 세부내역</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>항목</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customsDetailItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.item_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{item.amount_krw.toLocaleString('ko-KR')}원</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell className="text-sm">합계</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {customsDetailItems.reduce((s, i) => s + i.amount_krw, 0).toLocaleString('ko-KR')}원
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">포워딩 세부내역</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>항목</TableHead>
                <TableHead className="text-right">견적금액</TableHead>
                <TableHead className="text-right">실청구액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forwardingQuotes.length > 0 ? forwardingQuotes.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{r.forwarder_name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.quote_amount_krw != null ? r.quote_amount_krw.toLocaleString('ko-KR') + '원' : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {r.actual_amount_krw != null ? r.actual_amount_krw.toLocaleString('ko-KR') + '원' : '-'}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4 text-sm">포워딩 데이터 없음</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {settlementId && (
        <Card>
          <CardHeader><CardTitle className="text-base">메모</CardTitle></CardHeader>
          <CardContent>
            <MemoField
              notes={notes}
              disabled={isLocked}
              onSave={async (newNotes) => {
                const { error } = await supabase.from('closing_settlements').update({ notes: newNotes }).eq('id', settlementId)
                if (error) throw error
                setNotes(newNotes)
              }}
            />
          </CardContent>
        </Card>
      )}
      {!isLocked && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>저장</Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>확정 및 잠금</Button>
          <Button variant="ghost" onClick={() => router.push(`/transactions/${id}`)}>취소</Button>
        </div>
      )}
    </div>
  )
}

