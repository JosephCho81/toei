export function calcImportAmountKrw(
  importAmountUsd: number,
  customsExchangeRate: number,
  marginRatePct: number
): number {
  return Math.round(importAmountUsd * customsExchangeRate * (1 + marginRatePct / 100))
}

export function sumAmountKrw(items: { amountKrw: number }[]): number {
  return items.reduce((s, i) => s + i.amountKrw, 0)
}

/**
 * 달러 → 원화 환산. 담당자가 원화 소수점을 보지 않도록 항상 반올림한다.
 * 환율이나 금액이 비어 있으면 0 (계산에서 조용히 빠지도록).
 */
export function usdToKrw(amountUsd: number | null | undefined, rate: number | null | undefined): number {
  if (amountUsd == null || rate == null) return 0
  if (!Number.isFinite(amountUsd) || !Number.isFinite(rate)) return 0
  return Math.round(amountUsd * rate)
}

/** 원화 → 달러 환산(참고 표시용). 환율이 없거나 0이면 null. */
export function krwToUsd(amountKrw: number | null | undefined, rate: number | null | undefined): number | null {
  if (amountKrw == null || rate == null) return null
  if (!Number.isFinite(amountKrw) || !Number.isFinite(rate) || rate === 0) return null
  return Math.round((amountKrw / rate) * 100) / 100
}
