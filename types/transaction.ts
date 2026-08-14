type Item = {
  spec: string | null; size: string | null; quantity: number | null
  color: string | null; glove_type: string | null; unit: string | null
  unit_price_usd: number | null; sort_order: number
}

export type TxRow = {
  id: string; round_no: number; round_label: string; order_no: string | null
  lc_open_date: string | null; settlement_status: string; is_locked: boolean
  manufacturers: { name: string } | { name: string }[] | null
  transaction_items: Item[] | null
  containers: { etd: string | null; eta: string | null }[] | null
  delivery_dates: Array<{ seq: number; date: string }> | null
}

export const FLAG_FIELDS = ['금액', '품목', '수량', '기타'] as const
export type FlagField = typeof FLAG_FIELDS[number]

/** 거래 오류 검토 플래그 (transaction_flags) */
export type TxFlag = {
  id: string
  transaction_id: string
  field: FlagField
  memo: string | null
  status: 'open' | 'resolved'
  resolved_memo: string | null
  created_at: string
}

export interface ContainerRow {
  _key: string
  container_no: string
  carrier: string
  etd: string
  eta: string
}
