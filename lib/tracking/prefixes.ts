export type ApiType = 'maersk_official' | 'hapag_official' | 'manual'

export interface CarrierInfo {
  carrier: string | null
  apiType: ApiType
  trackingUrl: string | null
}

// 정적 fallback (DB 조회 실패 시)
const STATIC_PREFIXES: Record<string, CarrierInfo> = {
  MRKU: { carrier: 'Maersk', apiType: 'maersk_official', trackingUrl: 'https://www.maersk.com/tracking/' },
  MSKU: { carrier: 'Maersk', apiType: 'maersk_official', trackingUrl: 'https://www.maersk.com/tracking/' },
  MAEU: { carrier: 'Maersk', apiType: 'maersk_official', trackingUrl: 'https://www.maersk.com/tracking/' },
  HLXU: { carrier: 'Hapag-Lloyd', apiType: 'hapag_official', trackingUrl: 'https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-container.html' },
  HLCU: { carrier: 'Hapag-Lloyd', apiType: 'hapag_official', trackingUrl: 'https://www.hapag-lloyd.com/en/online-business/tracing/tracing-by-container.html' },
}

export function detectCarrier(containerNo: string): CarrierInfo {
  const normalized = containerNo.toUpperCase().replace(/\s/g, '')
  const prefix = normalized.slice(0, 4)
  return STATIC_PREFIXES[prefix] ?? {
    carrier: null,
    apiType: 'manual',
    trackingUrl: null,
  }
}
