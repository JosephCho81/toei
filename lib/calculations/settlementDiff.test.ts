// 실행: node --test lib/calculations/settlementDiff.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { interimDiffKrw, type InterimDiffInput } from './settlementDiff.ts'
import { calculateInterim, type CostItem } from './interim.ts'

// 검증 이슈 화면이 「확정금액이 틀렸다」고 띄우는 근거가 이 차액이다.
// 재계산이 규약에서 조금이라도 벗어나면 멀쩡한 차수가 오류로 뜬다.

const base = (over: Partial<InterimDiffInput> = {}): InterimDiffInput => ({
  confirmedKrw: 0,
  importAmountUsd: 79200,
  customsExchangeRate: 1328.13,
  marginRatePct: 7,
  costItems: [],
  roundingPolicy: 'floor_100',
  vatMode: 'exclusive',
  ...over,
})

/** 규약대로의 확정금액 */
function confirmed(input: InterimDiffInput): number {
  return calculateInterim({
    importAmountUsd: input.importAmountUsd!,
    customsExchangeRate: input.customsExchangeRate!,
    marginRatePct: input.marginRatePct ?? 0,
    costItems: input.costItems,
    roundingPolicy: input.roundingPolicy,
    vatMode: input.vatMode,
  }).confirmedKrw
}

test('규약대로 저장된 정산은 차액 0', () => {
  const input = base({ costItems: [{ amountKrw: 2_666_707 }] })
  assert.equal(interimDiffKrw({ ...input, confirmedKrw: confirmed(input) }), 0)
})

test('항목 부가세가 있어도 차액 0 — 공급가에 포함하는 규약을 따른다', () => {
  const costItems: CostItem[] = [
    { amountKrw: 3_440_168 },
    { amountKrw: 18_000, isVatTaxable: true },
    { amountKrw: 29_400, isVatTaxable: true },
  ]
  const input = base({ costItems })
  assert.equal(interimDiffKrw({ ...input, confirmedKrw: confirmed(input) }), 0)
  // 항목 부가세를 빠뜨리고 계산하면 차액이 생긴다 — 옛 대시보드 공식의 오류
  const withoutItemVat = calculateInterim({
    importAmountUsd: 79200, customsExchangeRate: 1328.13, marginRatePct: 7,
    costItems: costItems.map((c) => ({ amountKrw: c.amountKrw })),
    roundingPolicy: 'floor_100', vatMode: 'exclusive',
  }).confirmedKrw
  assert.notEqual(withoutItemVat, confirmed(input))
})

test('수입부가세는 공급가에서 빠진다 — 재계산도 같아야 차액 0', () => {
  const input = base({
    costItems: [{ amountKrw: 10_530_210, isImportVat: true }, { amountKrw: 283_800 }],
  })
  assert.equal(interimDiffKrw({ ...input, confirmedKrw: confirmed(input) }), 0)
})

test('inclusive 정산에는 매출부가세를 붙이지 않는다', () => {
  const input = base({ vatMode: 'inclusive', costItems: [{ amountKrw: 2_666_707 }] })
  const c = confirmed(input)
  assert.equal(interimDiffKrw({ ...input, confirmedKrw: c }), 0)
  // exclusive 로 재계산하면 매출부가세만큼 차이가 난다
  assert.ok(interimDiffKrw({ ...input, vatMode: 'exclusive', confirmedKrw: c })! < 0)
})

test('절사 정책을 무시하면 차액이 생긴다', () => {
  const input = base({ costItems: [{ amountKrw: 2_666_707 }] })
  const c = confirmed(input)
  const diff = interimDiffKrw({ ...input, roundingPolicy: 'none', confirmedKrw: c })
  assert.notEqual(diff, 0)
})

test('재계산에 필요한 값이 없으면 null — 0 으로 오해하면 안 된다', () => {
  assert.equal(interimDiffKrw(base({ confirmedKrw: null })), null)
  assert.equal(interimDiffKrw(base({ importAmountUsd: null })), null)
  assert.equal(interimDiffKrw(base({ customsExchangeRate: null })), null)
})
