/** 클로징 LC 수수료 기본 항목. 새 정산에서만 쓰이고 저장된 정산은 DB 값을 따른다. */
export interface FeeRow {
  id?: string
  item_name: string
  /** 원화 직접 입력값 (currency === 'KRW' 일 때 사용) */
  amount_krw: string
  currency: 'KRW' | 'USD'
  /** 달러 입력값 (currency === 'USD' 일 때 사용, 클로징환율로 환산) */
  amount_usd: string
}

export const DEFAULT_LC_FEE_ROWS: FeeRow[] = [
  { item_name: '개설', amount_krw: '', currency: 'KRW', amount_usd: '' },
  { item_name: '기한연장', amount_krw: '0', currency: 'KRW', amount_usd: '' },
  { item_name: '조건변경', amount_krw: '0', currency: 'KRW', amount_usd: '' },
  { item_name: '인수', amount_krw: '', currency: 'KRW', amount_usd: '' },
  // 이자는 달러로 청구돼 클로징환율로 환산한다 (담당자 요청)
  { item_name: '이자', amount_krw: '0', currency: 'USD', amount_usd: '' },
  { item_name: '기타', amount_krw: '0', currency: 'KRW', amount_usd: '' },
  { item_name: '환급', amount_krw: '0', currency: 'KRW', amount_usd: '' },
]
