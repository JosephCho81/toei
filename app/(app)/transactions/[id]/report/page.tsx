import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { loadReportData } from '@/lib/data/reportData'
import { ReportHeader } from '@/components/report/ReportHeader'
import { ConfidentialWatermark, ReportBanner } from '@/components/report/ReportBanner'
import { ReportSection } from '@/components/report/ReportSection'
import { ReportItemsSection } from '@/components/report/ReportItemsSection'
import { ReportInterimSection } from '@/components/report/ReportInterimSection'
import { ReportForwardingSection } from '@/components/report/ReportForwardingSection'
import { ReportClosingSection } from '@/components/report/ReportClosingSection'
import { ReportKpiCards } from '@/components/report/ReportKpiCards'
import { ReportTimeline } from '@/components/report/ReportTimeline'
import { ReportFlowDiagram } from '@/components/report/ReportFlowDiagram'
import { ReportFooter } from '@/components/report/ReportFooter'
import { Separator } from '@/components/ui/separator'

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await loadReportData(await createClient(), id)
  if (!data) notFound()

  const {
    t, interim, closing, txItems, mfr, importUsd, customsRate, txCustomsRate, bokRate, lcPayment,
    shippingItems, customsItems, vatAmountKrw, interimVatMode, marginRatePct,
    interimImportKrw, interimConfirmedKrw, interimDirection,
    lcFeesParsed, closingCostsParsed, fxBurdenA1Pct, importAmountKrw, closingCalc,
    customsDate, nonVatCostsTotal, sectionIRows, forwardingQuotes,
  } = data

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })


  return (
    <div id="report-content" className="max-w-5xl print:shadow-none">
      <ConfidentialWatermark />

      <ReportHeader
        roundLabel={t.round_label}
        orderNo={t.order_no ?? null}
        transactionId={id}
        interimId={interim?.id ?? null}
        closingId={closing?.id ?? null}
        interimLocked={interim?.is_locked ?? false}
        closingLocked={closing?.is_locked ?? false}
      />

      <ReportBanner
        roundLabel={t.round_label}
        manufacturerName={mfr?.name ?? null}
        orderNo={t.order_no ?? null}
      />

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
            vatMode: interimVatMode,
            supplyAmountKrw: interim?.supply_amount_krw ?? null,
            outputVatKrw: interim?.vat_amount_krw ?? null,
            confirmedAmountKrw: interimConfirmedKrw,
            interimDirection,
          }} />

          {/* IV. 포워딩 견적 */}
          <ReportForwardingSection rows={forwardingQuotes} />
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
          a1ClosingCostsKrw={closingCalc.a1ClosingCostsKrw}
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
            vatMode: closingCalc.vatMode,
            supplyAmountKrw: closingCalc.supplyAmountKrw,
            outputVatKrw: closingCalc.vatKrw,
            closingCostItems: closingCostsParsed,
            closingCostsTotalKrw: closingCalc.closingCostsTotalKrw,
            a1ClosingCostsKrw: closingCalc.a1ClosingCostsKrw,
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

      <ReportFooter roundLabel={t.round_label} today={today} />

    </div>
  )
}
