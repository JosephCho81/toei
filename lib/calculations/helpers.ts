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
