// 실행: node --test lib/pdf/interimRows.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildInterimCostRows, type InterimPdfCostItem } from './interimRows.ts'
import { calculateInterim } from '../calculations/interim.ts'

// 청구서 PDF 는 나열한 금액을 더하면 공급가가 나와야 한다.
// 차감 줄(수입부가세·관세)이 빠지면 받는 쪽이 검산할 수 없다.

const item = (over: Partial<InterimPdfCostItem>): InterimPdfCostItem => ({
  itemName: '항목', amountKrw: 0, groupType: 'shipping',
  isImportVat: false, isVatTaxable: false, vatAmountKrw: 0, ...over,
})

const costItems = [
  item({ itemName: 'OCEAN FREIGHT', amountKrw: 3_440_168 }),
  item({ itemName: 'T.H.C', amountKrw: 18_000, isVatTaxable: true }),
  item({ itemName: '수입부가세', amountKrw: 10_530_210, groupType: 'customs', isImportVat: true }),
  item({ itemName: '통관보수료', amountKrw: 173_800, groupType: 'customs' }),
]

function build(exclusive: boolean) {
  const calc = calculateInterim({
    importAmountUsd: 79200, customsExchangeRate: 1328.13, marginRatePct: 7,
    costItems: costItems.map((c) => ({
      amountKrw: c.amountKrw, isImportVat: c.isImportVat,
      isVatTaxable: c.isVatTaxable, vatAmountKrw: c.vatAmountKrw,
    })),
    roundingPolicy: 'none', vatMode: exclusive ? 'exclusive' : 'inclusive',
  })
  return {
    calc,
    rows: buildInterimCostRows({
      costItems, importAmountKrw: calc.importAmountKrw, importFormula: '',
      exclusive, supplyAmountKrw: calc.supplyAmountKrw, outputVatKrw: calc.vatKrw,
    }),
  }
}

test('신방식: 나열된 금액을 더하면 공급가가 나온다', () => {
  const { calc, rows } = build(true)
  const supplyRowIdx = rows.findIndex((r) => r.itemName === '공급가 (부가세 별도)')
  assert.ok(supplyRowIdx > 0)
  const sum = rows.slice(0, supplyRowIdx).reduce((s, r) => s + r.amountKrw, 0)
  assert.equal(sum, calc.supplyAmountKrw)
  assert.equal(rows[supplyRowIdx].amountKrw, calc.supplyAmountKrw)
})

// 2026-09-04 규약: 항목 부가세는 공급가에 들어가지 않는다. 참고 줄로만 남고 금액은 0이다.
test('신방식: 항목 부가세는 참고 줄이고 공급가를 움직이지 않는다', () => {
  const { calc, rows } = build(true)
  assert.ok(calc.itemVatKrw > 0)
  assert.equal(rows.find((r) => r.itemName === '항목 부가세 가산'), undefined)
  const ref = rows.find((r) => r.itemName === '(참고) 항목 부가세')
  assert.ok(ref)
  assert.equal(ref!.amountKrw, 0)
})

test('신방식: 관세는 차감 줄과 가산 줄로 한 번씩 나온다', () => {
  const rows = buildInterimCostRows({
    costItems: [item({ amountKrw: 100_000 }), item({ itemName: '관세', amountKrw: 1_836_920, groupType: 'customs', isDuty: true })],
    importAmountKrw: 1_000_000, importFormula: '', exclusive: true,
    supplyAmountKrw: 1_100_000, outputVatKrw: 110_000,
  })
  assert.equal(rows.find((r) => r.itemName === '관세 차감')!.amountKrw, -1_836_920)
  assert.equal(rows.find((r) => r.itemName === '관세 가산')!.amountKrw, 1_836_920)
  // 공급가 줄 앞까지 더하면 공급가가 나온다 — 관세가 빠진 상태여야 맞다
  const idx = rows.findIndex((r) => r.itemName === '공급가 (부가세 별도)')
  assert.equal(rows.slice(0, idx).reduce((s, r) => s + r.amountKrw, 0), 1_100_000)
})

test('신방식: 수입부가세는 음수로 차감 표기한다', () => {
  const { calc, rows } = build(true)
  const row = rows.find((r) => r.itemName === '수입부가세 차감')!
  assert.equal(row.amountKrw, -calc.importVatKrw)
})

test('항목 부가세가 없으면 그 줄을 넣지 않는다', () => {
  const rows = buildInterimCostRows({
    costItems: [item({ amountKrw: 100_000 })],
    importAmountKrw: 1_000_000, importFormula: '', exclusive: true,
    supplyAmountKrw: 1_100_000, outputVatKrw: 110_000,
  })
  assert.equal(rows.find((r) => r.itemName === '(참고) 항목 부가세'), undefined)
  assert.equal(rows.find((r) => r.itemName === '수입부가세 차감'), undefined)
  assert.equal(rows.find((r) => r.itemName === '관세 차감'), undefined)
})

test('구방식은 공급가·부가세 줄을 만들지 않는다', () => {
  const { rows } = build(false)
  assert.equal(rows.find((r) => r.itemName === '공급가 (부가세 별도)'), undefined)
  assert.equal(rows.find((r) => r.itemName === '(참고) 항목 부가세'), undefined)
})

test('운송비가 통관비보다 먼저 나온다', () => {
  const { rows } = build(true)
  const ocean = rows.findIndex((r) => r.itemName === 'OCEAN FREIGHT')
  const customs = rows.findIndex((r) => r.itemName === '통관보수료')
  assert.ok(ocean < customs)
})
