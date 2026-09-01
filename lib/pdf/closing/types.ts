import type { RoundingPolicy } from '@/lib/calculations/closing'

export interface ClosingPdfData {
  roundLabel: string
  manufacturerName: string
  customsExchangeRate: number
  bokExchangeRate: number | null
  closingDate: string | null
  lcPaymentTotalKrw: number
  /** LC 결제비용 총액(USD)·선지급 구간 — 환율 민감도 시뮬레이션에 쓴다 */
  lcPaymentTotalUsd: number | null
  advancePaymentUsd: number | null
  advanceExchangeRate: number | null
  roundingPolicy: RoundingPolicy
  importAmountKrw: number
  importAmountUsd?: number
  vatAmountKrw?: number
  fxGainLossKrw: number
  lcFeeItems: { itemName: string; amountKrw: number }[]
  lcFeeTotalKrw: number
  additionalCostKrw: number
  fxBurdenA1Pct: number
  a1BurdenKrw: number
  a1BurdenWithVatKrw: number
  /** 'exclusive' = 공급가(부담분+추가비용) + 부가세 10%. 'inclusive' = 구방식 */
  vatMode: 'inclusive' | 'exclusive'
  supplyAmountKrw: number
  outputVatKrw: number
  closingCostItems: { itemName: string; amountKrw: number }[]
  closingCostsTotalKrw: number
  a1ClosingCostsKrw: number
  confirmedAmountKrw: number
  directionLabel: string
  isPaid: boolean
  issuedAt: string
  items: { spec: string; color: string; size: string; unitPriceUsd: number; quantity: number; unit: string }[]
  interimRate: number | null
  interimConfirmedKrw: number | null
  grandTotalKrw: number | null
  shippingItems: { itemName: string; amountKrw: number }[]
  customsItems: { itemName: string; amountKrw: number }[]
  customsDetailItems: { itemName: string; amountKrw: number }[]
  forwardingQuotes: { itemName: string; quoteAmountKrw: number | null; actualAmountKrw: number | null }[]
}
