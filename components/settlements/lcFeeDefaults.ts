import { feeExchangeRate, feeRateMissing } from '@/lib/calculations/closing'

export { feeExchangeRate, feeRateMissing }

/** 클로징 LC 수수료 기본 항목. 새 정산에서만 쓰이고 저장된 정산은 DB 값을 따른다. */
export interface FeeRow {
  id?: string
  item_name: string
  /** 원화 직접 입력값 (currency === 'KRW' 일 때 사용) */
  amount_krw: string
  currency: 'KRW' | 'USD'
  /** 달러 입력값 (currency === 'USD' 일 때 사용, 클로징환율로 환산) */
  amount_usd: string
  /**
   * 이 항목에만 적용할 별도 환율(은행 매도환율 등).
   * 체크를 별도 필드로 두는 이유: 체크 직후 환율 입력칸이 비어 있는 상태를 '클로징환율 사용'과 구분해야 한다.
   */
  use_custom_rate: boolean
  exchange_rate: string
}

/** 새 행 기본값 — 항목 추가 버튼과 통화 전환에서 공통으로 쓴다. */
export const EMPTY_FEE_ROW: FeeRow = {
  item_name: '', amount_krw: '0', currency: 'KRW', amount_usd: '',
  use_custom_rate: false, exchange_rate: '',
}

const krwRow = (item_name: string, amount_krw: string): FeeRow => ({
  ...EMPTY_FEE_ROW, item_name, amount_krw,
})

export const DEFAULT_LC_FEE_ROWS: FeeRow[] = [
  krwRow('개설', ''),
  krwRow('기한연장', '0'),
  krwRow('조건변경', '0'),
  krwRow('인수', ''),
  // 이자는 달러로 청구돼 클로징환율로 환산한다 (담당자 요청).
  // 은행 매도환율로 결제되는 건은 행에서 '별도 환율 적용'을 켠다.
  { ...EMPTY_FEE_ROW, item_name: '이자', currency: 'USD' },
  krwRow('기타', '0'),
  krwRow('환급', '0'),
]
