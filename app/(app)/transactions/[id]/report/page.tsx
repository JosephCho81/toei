import { createClient } from '@/lib/supabase/server'
import { normalizeOne } from '@/lib/utils/normalize'
import { notFound } from 'next/navigation'
import { calculateClosing } from '@/lib/calculations/closing'
import { calcImportAmountKrw } from '@/lib/calculations/helpers'
import { aggregateForwardingQuotes } from '@/lib/utils/forwarding'
import {
  fetchTransactionBase, fetchInterimSettlement, fetchClosingSettlement,
  fetchForwardingQuotes, fetchInterimCostItems, fetchClosingCostItems,
} from '@/lib/data/queries'
import { formatDate, formatUsd, formatExchangeRate } from '@/lib/utils/format'
import { ReportHeader } from '@/components/report/ReportHeader'
import { ReportSection } from '@/components/report/ReportSection'
import { ReportItemsSection } from '@/components/report/ReportItemsSection'
import { ReportInterimSection } from '@/components/report/ReportInterimSection'
import { ReportForwardingSection } from '@/components/report/ReportForwardingSection'
import { ReportClosingSection } from '@/components/report/ReportClosingSection'
import { ReportKpiCards } from '@/components/report/ReportKpiCards'
import { ReportTimeline } from '@/components/report/ReportTimeline'
import { ReportFlowDiagram } from '@/components/report/ReportFlowDiagram'
import { ReportBenchmark } from '@/components/report/ReportBenchmark'
import { ReportRoundChart } from '@/components/report/ReportRoundChart'
import { Separator } from '@/components/ui/separator'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [t, interim, closing, fwdRows, { data: txItems }] = await Promise.all([
    fetchTransactionBase(supabase, id),
    fetchInterimSettlement(supabase, id),
    fetchClosingSettlement(supabase, id),
    fetchForwardingQuotes(supabase, id),
    supabase.from('transaction_items')
      .select('id,spec,glove_type,color,size,unit_price_usd,quantity,unit')
      .eq('transaction_id', id).order('sort_order'),
  ])

  if (!t) notFound()

  const [interimCosts, closingCostData, { data: benchRaw }, { data: allRoundsRaw }] = await Promise.all([
    interim?.id ? fetchInterimCostItems(supabase, interim.id) : Promise.resolve([]),
    closing?.id ? fetchClosingCostItems(supabase, closing.id) : Promise.resolve({ lcFees: [], closingCosts: [] }),
    // 벤치마크: 확정된 클로징 정산 전체
    supabase
      .from('closing_settlements')
      .select('lc_payment_total_krw, closing_date, transactions!transaction_id(import_amount_usd, lc_open_date, margin_rate_pct, customs_exchange_rate)')
      .eq('is_locked', true),
    // 차수별 중간정산 확정금액
    supabase
      .from('transactions')
      .select('round_no, round_label, interim_settlements(confirmed_amount_krw)')
      .order('round_no'),
  ])
  const lcFees = closingCostData.lcFees
  const closingCosts = closingCostData.closingCosts

  const mfr = t.manufacturers as { name: string } | null
  const importUsd = Number(t.import_amount_usd ?? 0)
  const txCustomsRate = Number(t.customs_exchange_rate ?? 0)
  const interimRate = interim?.customs_exchange_rate ? Number(interim.customs_exchange_rate) : null
  const customsRate = interimRate ?? txCustomsRate
  const bokRate = closing?.bok_exchange_rate ? Number(closing.bok_exchange_rate) : null

  const shippingItems = interimCosts.filter(i => i.group_type === 'shipping')
  const customsItems = interimCosts.filter(i => i.group_type !== 'shipping')
  const vatAmountKrw = interimCosts.reduce((s, i) => s + i.vat_amount_krw, 0)
  const marginRatePct = t.margin_rate_pct ? Number(t.margin_rate_pct) : null
  const interimImportKrw = customsRate ? calcImportAmountKrw(importUsd, customsRate, marginRatePct ?? 0) : 0
  const interimConfirmedKrw = interim?.confirmed_amount_krw ? Number(interim.confirmed_amount_krw) : null
  const interimDirection = interimConfirmedKrw != null && interimConfirmedKrw !== 0
    ? interimConfirmedKrw >= 0 ? '한국에이원 → 토에이산교 지급' : '토에이산교 → 한국에이원 지급'
    : null

  const lcFeesParsed = (lcFees ?? []).map((f) => ({ item_name: String(f.item_name), amount_krw: Number(f.amount_krw) }))
  const closingCostsParsed = (closingCosts ?? []).map((c) => ({ item_name: String(c.item_name), amount_krw: Number(c.amount_krw) }))
  const fxBurdenA1Pct = closing?.fx_burden_a1_pct ?? 50
  const lcPayment = closing?.lc_payment_total_krw ? Number(closing.lc_payment_total_krw) : 0
  const importAmountKrw = txCustomsRate > 0 ? calcImportAmountKrw(importUsd, txCustomsRate, 0) : 0

  const closingCalc = closing && txCustomsRate > 0
    ? calculateClosing({
        lcPaymentTotalKrw: lcPayment,
        importAmountUsd: importUsd,
        customsExchangeRate: txCustomsRate,
        lcFeeItems: lcFeesParsed.map((f) => ({ amountKrw: f.amount_krw })),
        fxBurdenA1Pct,
        closingCostItems: closingCostsParsed.map((c) => ({ amountKrw: c.amount_krw, includesVat: false })),
        roundingPolicy: 'none',
        interimConfirmedKrw: interim?.confirmed_amount_krw ? Number(interim.confirmed_amount_krw) : 0,
      })
    : null

  const customsDate = (t as Record<string, unknown>).customs_date as string | null | undefined

  // 추가 계산값
  const customsItemsTotal = customsItems.reduce((s, i) => s + i.amount_krw, 0)
  const shippingItemsTotal = shippingItems.reduce((s, i) => s + i.amount_krw, 0)
  const nonVatCostsTotal = customsItemsTotal + shippingItemsTotal
  const allCostsTotal = nonVatCostsTotal + vatAmountKrw
  const settledDays = t.lc_open_date && closing?.closing_date
    ? Math.round((new Date(closing.closing_date).getTime() - new Date(t.lc_open_date as string).getTime()) / (1000 * 60 * 60 * 24))
    : null
  const lcFeeRatePct = interimImportKrw > 0 && closingCalc
    ? closingCalc.lcFeeTotalKrw / interimImportKrw * 100
    : null

  // 벤치마크 집계
  type BenchRow = {
    lc_payment_total_krw: unknown
    closing_date: string | null
    transactions: { import_amount_usd: unknown; lc_open_date: string | null; margin_rate_pct: unknown; customs_exchange_rate: unknown } | { import_amount_usd: unknown; lc_open_date: string | null; margin_rate_pct: unknown; customs_exchange_rate: unknown }[] | null
  }
  const benchRows = (benchRaw ?? []) as BenchRow[]
  let sumMargin = 0, countMargin = 0, sumFxAbs = 0, countFx = 0, sumDays = 0, countDays = 0
  for (const row of benchRows) {
    const tx = normalizeOne(row.transactions)
    if (!tx) continue
    const mp = tx.margin_rate_pct != null ? Number(tx.margin_rate_pct) : null
    if (mp != null) { sumMargin += mp; countMargin++ }
    const lp = row.lc_payment_total_krw != null ? Number(row.lc_payment_total_krw) : null
    const iu = tx.import_amount_usd != null ? Number(tx.import_amount_usd) : null
    const cr = tx.customs_exchange_rate != null ? Number(tx.customs_exchange_rate) : null
    if (lp != null && iu != null && cr != null) { sumFxAbs += Math.abs(lp - iu * cr); countFx++ }
    if (row.closing_date && tx.lc_open_date) {
      const d = Math.round((new Date(row.closing_date).getTime() - new Date(tx.lc_open_date).getTime()) / (1000 * 60 * 60 * 24))
      if (d > 0) { sumDays += d; countDays++ }
    }
  }
  const avgMarginPct = countMargin > 0 ? sumMargin / countMargin : null
  const avgFxAbsKrw = countFx > 0 ? sumFxAbs / countFx : null
  const avgDays = countDays > 0 ? Math.round(sumDays / countDays) : null

  // 차수별 라인차트 데이터
  type RoundRow = { round_no: number; round_label: string; interim_settlements: { confirmed_amount_krw: unknown }[] | null }
  const roundChartData = ((allRoundsRaw ?? []) as RoundRow[])
    .map(r => {
      const s = normalizeOne(r.interim_settlements)
      if (!s?.confirmed_amount_krw) return null
      return { roundNo: r.round_no, roundLabel: r.round_label, confirmedAmountKrw: Number(s.confirmed_amount_krw) }
    })
    .filter((x): x is { roundNo: number; roundLabel: string; confirmedAmountKrw: number } => x != null)

  // Section I 데이터
  const sectionIRows: [string, string, string, string][] = [
    ['제조사', mfr?.name ?? '-', 'LC개설일', formatDate(t.lc_open_date)],
    ['수입금액', formatUsd(importUsd), '마진율', t.margin_rate_pct ? `${t.margin_rate_pct}%` : '-'],
    ['통관일', formatDate(customsDate ?? null), '통관환율', customsRate > 0 ? `${formatExchangeRate(customsRate)} (입고시 세관 신고 환율)` : '-'],
    [
      '클로징환율',
      bokRate != null ? `${formatExchangeRate(bokRate)} (한국은행 최초 고시 환율${closing?.closing_date ? `, ${closing.closing_date} 기준` : ''})` : '-',
      '', '',
    ],
  ]

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div id="report-content" className="max-w-5xl print:shadow-none">
      {/* 대외비 워터마크 */}
      <div
        aria-hidden
        className="pointer-events-none select-none fixed inset-0 z-0 overflow-hidden"
        style={{ opacity: 0.04 }}
      >
        <div style={{
          position: 'absolute', inset: '-60%',
          display: 'flex', flexWrap: 'wrap', gap: '40px',
          transform: 'rotate(-45deg)', alignContent: 'flex-start',
        }}>
          {Array.from({ length: 300 }, (_, i) => (
            <span key={i} style={{ fontSize: '40px', fontWeight: 900, color: '#000', whiteSpace: 'nowrap' }}>
              대외비
            </span>
          ))}
        </div>
      </div>

      <ReportHeader
        roundLabel={t.round_label}
        orderNo={t.order_no ?? null}
        transactionId={id}
        interimId={interim?.id ?? null}
        closingId={closing?.id ?? null}
        interimLocked={interim?.is_locked ?? false}
        closingLocked={closing?.is_locked ?? false}
      />

      {/* 헤더 배너 */}
      <div className="border border-green-200 rounded-lg px-6 py-5 flex items-center justify-between bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/CI_a1korea.png" alt="한국에이원" style={{ height: '48px', objectFit: 'contain' }} />
        <div className="text-center">
          <h1 className="text-lg font-bold text-green-800">토에이산교 ↔ 한국에이원</h1>
          <p className="text-base font-semibold text-green-700 mt-0.5">정산 리포트</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t.round_label}{mfr?.name ? ` | ${mfr.name}` : ''}{t.order_no ? ` | ${t.order_no}` : ''}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/CI_toei.png" alt="토에이산교" style={{ height: '48px', objectFit: 'contain' }} />
      </div>
      <p className="text-xs text-right mb-4 mt-1" style={{ color: '#666666' }}>
        ※ 모든 금액은 부가세 별도 기준입니다.
      </p>

      {/* KPI 카드 */}
      <ReportKpiCards
        importUsd={importUsd}
        marginRatePct={marginRatePct}
        fxGainLossKrw={closingCalc?.fxGainLossKrw ?? null}
        grandTotalKrw={interimConfirmedKrw != null && closingCalc ? closingCalc.grandTotalKrw : null}
      />

      {/* I. 거래 개요 */}
      <ReportSection title="I. 거래 개요">
        <div className="border border-green-200 rounded-lg overflow-hidden text-sm">
          {sectionIRows.map(([l1, v1, l2, v2], i) => (
            <div key={i} className={`flex ${i > 0 ? 'border-t border-green-200' : ''}`}>
              <div className="w-28 px-3 py-2 text-muted-foreground font-medium bg-green-50/50 border-r border-green-200 shrink-0">{l1}</div>
              <div className="flex-1 px-3 py-2 font-mono border-r border-green-200">{v1}</div>
              <div className="w-28 px-3 py-2 text-muted-foreground font-medium bg-green-50/50 border-r border-green-200 shrink-0">{l2}</div>
              <div className="flex-1 px-3 py-2 font-mono">{v2}</div>
            </div>
          ))}
        </div>
        {/* 거래 타임라인 */}
        <ReportTimeline
          lcOpenDate={t.lc_open_date ?? null}
          customsDate={customsDate ?? null}
          closingDate={closing?.closing_date ?? null}
          customsRate={customsRate || null}
          bokRate={bokRate}
        />
      </ReportSection>

      {/* II. 수입 품목 내역 */}
      {txItems && txItems.length > 0 && (
        <ReportItemsSection
          items={txItems}
          importAmountUsd={importUsd || null}
          marginRatePct={marginRatePct}
        />
      )}

      {/* ===== 중간정산 ===== */}
      {interim ? (
        <>
          {/* III. 중간정산 내역 */}
          <ReportInterimSection data={{
            customs_exchange_rate: customsRate,
            importAmountUsd: importUsd,
            importAmountKrw: interimImportKrw,
            marginRatePct,
            shippingItems,
            customsItems,
            vatAmountKrw,
            confirmedAmountKrw: interimConfirmedKrw,
            interimDirection,
          }} />

          {/* IV. 포워딩 견적 */}
          <ReportForwardingSection rows={aggregateForwardingQuotes(fwdRows ?? []).map((q, i) => ({
            forwarder_name: q.forwarderName || null,
            quote_date: fwdRows?.[i]?.quote_date ?? null,
            notes: fwdRows?.[i]?.notes ?? null,
            quote_amount_krw: q.quoteAmountKrw || null,
            actual_amount_krw: q.actualAmountKrw || null,
          }))} />
        </>
      ) : (
        <ReportSection title="III. 중간정산 내역">
          <p className="text-sm text-muted-foreground">중간정산 데이터 없음</p>
        </ReportSection>
      )}

      {/* 계산 플로우 다이어그램 (중간정산~클로징 사이) */}
      {closingCalc && interimConfirmedKrw != null && closing?.confirmed_amount_krw && (
        <ReportFlowDiagram
          importAmountKrw={interimImportKrw}
          nonVatCostsTotal={nonVatCostsTotal}
          vatAmountKrw={vatAmountKrw}
          interimConfirmedKrw={interimConfirmedKrw}
          fxGainLossKrw={closingCalc.fxGainLossKrw}
          lcFeeTotalKrw={closingCalc.lcFeeTotalKrw}
          fxBurdenPct={fxBurdenA1Pct}
          a1BurdenKrw={closingCalc.a1BurdenKrw}
          a1BurdenWithVatKrw={closingCalc.a1BurdenWithVatKrw}
          closingCostsTotalKrw={closingCalc.closingCostsTotalKrw}
          closingConfirmedKrw={Number(closing.confirmed_amount_krw)}
          grandTotalKrw={closingCalc.grandTotalKrw}
        />
      )}

      {/* ===== 클로징정산 ===== */}
      {closing && closingCalc ? (
        <>
          <div className="flex items-center gap-3 my-6">
            <Separator className="flex-1" />
            <span className="text-sm font-bold text-green-700 whitespace-nowrap px-2">
              V. 클로징정산 내역
            </span>
            <Separator className="flex-1" />
          </div>

          <ReportClosingSection data={{
            closing_date: closing.closing_date,
            bok_exchange_rate: bokRate,
            lc_payment_total_krw: lcPayment || null,
            customs_exchange_rate: txCustomsRate || null,
            importAmountUsd: importUsd || null,
            importAmountKrw,
            fxGainLossKrw: closingCalc.fxGainLossKrw,
            lcFeeItems: lcFeesParsed,
            lcFeeTotalKrw: closingCalc.lcFeeTotalKrw,
            fx_burden_a1_pct: fxBurdenA1Pct,
            a1BurdenKrw: closingCalc.a1BurdenKrw,
            a1BurdenWithVatKrw: closingCalc.a1BurdenWithVatKrw,
            closingCostItems: closingCostsParsed,
            closingCostsTotalKrw: closingCalc.closingCostsTotalKrw,
            confirmed_amount_krw: closing.confirmed_amount_krw ? Number(closing.confirmed_amount_krw) : null,
            interimConfirmedKrw,
            grandTotalKrw: interimConfirmedKrw != null ? closingCalc.grandTotalKrw : null,
          }} />

        </>
      ) : (
        closing === null && (
          <ReportSection title="V. 클로징정산 내역">
            <p className="text-sm text-muted-foreground">정산 데이터 없음</p>
          </ReportSection>
        )
      )}

      {/* 벤치마크 비교 */}
      {closingCalc && (
        <ReportBenchmark
          currentMarginPct={marginRatePct}
          currentFxAbsKrw={Math.abs(closingCalc.fxGainLossKrw)}
          currentDays={settledDays}
          currentLcFeeRatePct={lcFeeRatePct}
          avgMarginPct={avgMarginPct}
          avgFxAbsKrw={avgFxAbsKrw}
          avgDays={avgDays}
          benchCount={countDays}
        />
      )}

      {/* 차수별 비교 라인차트 */}
      {roundChartData.length > 1 && (
        <ReportRoundChart
          data={roundChartData}
          currentRoundNo={Number(t.round_no)}
        />
      )}

      {/* 푸터 */}
      <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-muted-foreground flex justify-between items-center">
        <span>한국에이원 | {t.round_label} 정산 리포트</span>
        <span>{today} 생성</span>
      </footer>

      {/* 도장 란 (인쇄 시만 표시) */}
      <div className="hidden print:block mt-8 break-before-page">
        <p className="text-xs text-muted-foreground mb-2 text-center">결재</p>
        <table className="w-full border-collapse text-center text-sm" style={{ borderTop: '1px solid #9ca3af' }}>
          <thead>
            <tr>
              {['담당자', '확인자', '승인자'].map(h => (
                <th key={h} className="font-medium py-2 text-muted-foreground" style={{ border: '1px solid #9ca3af', width: '33.33%' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[0, 1, 2].map(i => (
                <td key={i} style={{ border: '1px solid #9ca3af', height: '80px' }} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
