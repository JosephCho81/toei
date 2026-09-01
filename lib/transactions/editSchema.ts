import { z } from 'zod'

export const schema = z.object({
  round_no: z.string().regex(/^\d+$/, '숫자만'),
  round_label: z.string().min(1, '필수'),
  manufacturer_id: z.string(),
  order_no: z.string(), import_amount_usd: z.string(),
  lc_no: z.string(), lc_open_date: z.string(),
  a1_payment_date: z.string(), lc_expiry_date: z.string(),
  customs_date: z.string(), customs_exchange_rate: z.string(),
  margin_rate_pct: z.string(),
  lc_status: z.string(), logistics_status: z.string(), document_status: z.string(),
  notes: z.string(),
})
export type FV = z.infer<typeof schema>

export interface InitData {
  round_no: number; round_label: string
  manufacturer_id: string | null; order_no: string | null
  import_amount_usd: string | number | null; lc_no: string | null
  lc_open_date: string | null; a1_payment_date: string | null
  lc_expiry_date: string | null; customs_date: string | null
  customs_exchange_rate: string | number | null; margin_rate_pct: string | number | null
  lc_status: string | null; logistics_status: string | null; document_status: string | null
  notes: string | null
  delivery_dates?: Array<{seq: number; date: string}> | null
}

function s(v: unknown): string { return v == null ? '' : String(v) }

/** 저장된 값을 폼 기본값으로. 숫자·날짜 컬럼이 null 이면 빈 문자열이다. */
export function toFormDefaults(d: InitData): FV {
  return {
    round_no: String(d.round_no),
    round_label: d.round_label,
    manufacturer_id: d.manufacturer_id ?? '',
    order_no: d.order_no ?? '',
    import_amount_usd: s(d.import_amount_usd),
    lc_no: d.lc_no ?? '',
    lc_open_date: d.lc_open_date ?? '',
    a1_payment_date: d.a1_payment_date ?? '',
    lc_expiry_date: d.lc_expiry_date ?? '',
    customs_date: d.customs_date ?? '',
    customs_exchange_rate: s(d.customs_exchange_rate),
    margin_rate_pct: s(d.margin_rate_pct),
    lc_status: d.lc_status ?? '',
    logistics_status: d.logistics_status ?? '',
    document_status: d.document_status ?? '',
    notes: d.notes ?? '',
  }
}

/** 폼 값 → transactions UPDATE payload. 빈 문자열은 전부 null 로 눕힌다. */
export function toUpdatePayload(v: FV, deliveryDates: { date: string }[]) {
  return {
    round_no: parseInt(v.round_no, 10),
    round_label: v.round_label,
    manufacturer_id: v.manufacturer_id || null,
    order_no: v.order_no || null,
    import_amount_usd: v.import_amount_usd ? parseFloat(v.import_amount_usd) : null,
    lc_no: v.lc_no || null,
    lc_open_date: v.lc_open_date || null,
    a1_payment_date: v.a1_payment_date || null,
    lc_expiry_date: v.lc_expiry_date || null,
    customs_date: v.customs_date || null,
    customs_exchange_rate: v.customs_exchange_rate ? parseFloat(v.customs_exchange_rate) : null,
    margin_rate_pct: v.margin_rate_pct ? parseFloat(v.margin_rate_pct) : null,
    lc_status: v.lc_status || null,
    logistics_status: v.logistics_status || null,
    document_status: v.document_status || null,
    notes: v.notes || null,
    delivery_dates: deliveryDates.length > 0
      ? deliveryDates.map((d, i) => ({ seq: i + 1, date: d.date }))
      : null,
  }
}
