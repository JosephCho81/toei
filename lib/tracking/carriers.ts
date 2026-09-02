/**
 * 선사 화물추적 매핑.
 *
 * 아래 URL·조회 방식은 2026-09-02 에 실제 접속해 확인했다 (verified 필드).
 * 확인하지 못한 곳은 verified:false 로 두고 화면에 그대로 표시한다 —
 * 담당자가 "왜 안 열리지" 하고 헤매는 것보다 낫다.
 *
 * deepLink 가 있는 선사는 번호가 URL에 들어가 조회까지 자동으로 되고,
 * 없는 선사는 조회 페이지만 열고 번호는 클립보드로 넘긴다.
 */

export interface Carrier {
  code: string
  /** 화면 표시명 */
  name: string
  /** 화물추적 페이지 */
  trackingUrl: string
  /** 번호를 URL에 실을 수 있는 선사만. 없으면 페이지만 열고 번호는 복사한다. */
  deepLink?: (no: string) => string
  /** B/L·컨테이너 번호 앞 4자리. 자동 감지에만 쓰이고, 최종 선택은 담당자 몫이다. */
  prefixes: string[]
  /** 입력 형식 주의사항 — 선사마다 받는 번호가 다르다. */
  hint?: string
  /** 실제 접속해 조회 화면을 확인했는지 */
  verified: boolean
  /**
   * containers.carrier 에 저장된 선사명 원문이나 유니패스 shcoFlcoSgn 에서
   * 이 선사를 알아보기 위한 조각. 별도 코드 컬럼을 두지 않고 이걸로 맞춘다.
   */
  aliases?: string[]
}

export const CARRIERS: Carrier[] = [
  {
    code: 'KMTC',
    aliases: ['KMTC', '고려해운'],
    name: '고려해운 (KMTC)',
    trackingUrl: 'https://www.ekmtc.com/index.html#/cargo-tracking',
    prefixes: ['KMTC', 'KMTU', 'KTMU', 'KULF'],
    hint: '선사 B/L(KMTC…)·부킹번호로 조회. House B/L(KULFE…)은 조회되지 않으니 통관조회를 쓸 것.',
    verified: true,
  },
  {
    code: 'NAMSUNG',
    aliases: ['NSSL', '남성해운', 'NAMSUNG'],
    name: '남성해운 (Namsung)',
    trackingUrl: 'https://ebiz.namsung.co.kr/?direct=Y&code=00010025&rtnUrl=/WS/trk/UIE0710.xml&title=%ED%99%94%EB%AC%BC%EC%B6%94%EC%A0%81',
    prefixes: ['NSSU'],
    hint: '컨테이너 번호 또는 B/L 번호로 조회.',
    verified: true,
  },
  {
    code: 'SINOKOR',
    aliases: ['SKR', '장금상선', 'SINOKOR'],
    name: '장금상선 (Sinokor)',
    trackingUrl: 'https://e-sinokor.com/',
    prefixes: ['SKHU', 'SEKU', 'SEGU'],
    hint: '메인 화면 "화물추적" 칸에 B/L 번호 입력. (컨테이너 prefix 매칭은 추정값이므로 다르면 드롭다운에서 바꿀 것)',
    verified: true,
  },
  {
    code: 'ONE',
    aliases: ['ONEY', 'OCEAN NETWORK'],
    name: 'ONE (Ocean Network Express)',
    trackingUrl: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking',
    prefixes: ['ONEY', 'ONEU'],
    hint: 'B/L 번호에서 앞의 ONEY 를 떼고 뒤 12자리만 입력. 포워더 House B/L 은 조회 불가(사이트 명시).',
    verified: true,
  },
  {
    code: 'HMM',
    aliases: ['HDMU', 'HMM', '현대상선'],
    name: 'HMM (현대상선)',
    trackingUrl: 'https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do',
    prefixes: ['HDMU', 'HMMU'],
    hint: 'B/L·컨테이너·부킹·P/O 번호로 조회.',
    verified: true,
  },
  {
    code: 'MAERSK',
    aliases: ['MAEU', 'MAERSK'],
    name: 'Maersk',
    trackingUrl: 'https://www.maersk.com/tracking/',
    deepLink: (no) => `https://www.maersk.com/tracking/${encodeURIComponent(no)}`,
    prefixes: ['MAEU', 'MRKU', 'MSKU'],
    hint: '번호가 URL에 실려 조회까지 자동으로 열린다.',
    verified: true,
  },
  {
    code: 'COSCO',
    aliases: ['COSU', 'COSCO'],
    name: 'COSCO',
    trackingUrl: 'https://elines.coscoshipping.com/ebusiness/cargoTracking',
    prefixes: ['COSU', 'CBHU', 'CCLU'],
    verified: true,
  },
  {
    code: 'MSC',
    aliases: ['MSCU', 'MSC'],
    name: 'MSC',
    trackingUrl: 'https://www.msc.com/en/track-a-shipment',
    prefixes: ['MSCU', 'MEDU'],
    hint: 'Container/Bill of Lading Number 또는 Booking Number 선택 후 입력.',
    verified: true,
  },
  {
    code: 'SITC',
    aliases: ['SITC'],
    name: 'SITC',
    trackingUrl: 'https://ebusiness.sitcline.com/',
    prefixes: ['SITC', 'SITU'],
    hint: '구 sitcline.com 은 폐지되고 ebusiness.sitcline.com 으로 이전됨.',
    verified: true,
  },
  {
    code: 'CMACGM',
    aliases: ['CMAU', 'CMA'],
    name: 'CMA CGM',
    trackingUrl: 'https://www.cma-cgm.com/ebusiness/tracking/search',
    prefixes: ['CMAU', 'CGMU'],
    hint: '접속 시 자동 봇 검증 화면이 잠깐 뜬 뒤 조회 화면으로 넘어간다.',
    verified: false,
  },
  {
    code: 'EVERGREEN',
    aliases: ['EGLV', 'EVERGREEN'],
    name: 'Evergreen',
    trackingUrl: 'https://www.shipmentlink.com/servlet/TDB1_CargoTracking.do',
    prefixes: ['EGLV', 'EMCU', 'EGHU'],
    hint: '조회 화면을 직접 확인하지 못했다. 안 열리면 알려줄 것.',
    verified: false,
  },
  {
    code: 'HAPAG',
    aliases: ['HLCU', 'HAPAG'],
    name: 'Hapag-Lloyd',
    trackingUrl: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html',
    prefixes: ['HLCU', 'HLXU'],
    hint: '조회 화면을 직접 확인하지 못했다. 안 열리면 알려줄 것.',
    verified: false,
  },
]

const BY_PREFIX = new Map<string, Carrier>()
for (const c of CARRIERS) {
  for (const p of c.prefixes) BY_PREFIX.set(p, c)
}

export function normalizeTrackingNo(no: string | null | undefined): string {
  return String(no ?? '').toUpperCase().replace(/[\s-]/g, '')
}

/**
 * 번호 앞 4자리로 선사를 추정한다.
 * 저장된 B/L 의 대부분이 포워더 House B/L 이라 이 추정은 자주 빗나간다.
 * 그래서 화면에서는 드롭다운의 초기값으로만 쓰고, 담당자가 언제든 바꿀 수 있어야 한다.
 */
export function detectCarrierByNo(no: string | null | undefined): Carrier | null {
  const prefix = normalizeTrackingNo(no).slice(0, 4)
  if (prefix.length < 4) return null
  return BY_PREFIX.get(prefix) ?? null
}

export function getCarrier(code: string | null | undefined): Carrier | null {
  if (!code) return null
  return CARRIERS.find((c) => c.code === code)
    ?? CARRIERS.find((c) => c.aliases?.some((a) => code.toUpperCase().includes(a.toUpperCase())))
    ?? null
}

/**
 * B/L → 컨테이너 번호 순으로 선사를 추정한다.
 * 컨테이너 번호가 리스회사 소유(FFAU·TXGU 등)면 선사를 알 수 없으므로 null 이 된다.
 */
export function detectCarrier(
  blNo: string | null | undefined,
  containerNo?: string | null
): Carrier | null {
  return detectCarrierByNo(blNo) ?? detectCarrierByNo(containerNo)
}

/** 조회 버튼이 열 URL. deepLink 가 없으면 조회 페이지만 연다. */
export function trackingHref(carrier: Carrier, no: string | null | undefined): string {
  const n = normalizeTrackingNo(no)
  return carrier.deepLink && n ? carrier.deepLink(n) : carrier.trackingUrl
}


/**
 * House B/L 로 시작하는 앞 4자리.
 *
 * 이 번호들은 포워더가 자기 고객용으로 끊은 것이라 선사 조회 시스템에 등재되지 않는다
 * (고려해운에서 KULFE2600620 조회 → "검색 결과가 없습니다" 확인).
 * 대신 수입신고 때 세관에 등록되므로 관세청 유니패스 기반 통관조회로는 잡힌다.
 *
 * 컨테이너 번호로 우회하는 것도 답이 아니다 — 컨테이너는 재사용되므로 선사 사이트는
 * 그 컨테이너의 다른 화물을 보여준다 (TCKU6688885 → 2024년 마닐라발 화물이 조회됨).
 */
const HOUSE_BL_PREFIXES = new Set(['KULF', 'WTTJ', 'PNKT', 'PKGI', 'STTS'])

export type BlKind = 'carrier' | 'house' | 'unknown'

export function detectBlKind(blNo: string | null | undefined): BlKind {
  const prefix = normalizeTrackingNo(blNo).slice(0, 4)
  if (prefix.length < 4) return 'unknown'
  if (HOUSE_BL_PREFIXES.has(prefix)) return 'house'
  return BY_PREFIX.has(prefix) ? 'carrier' : 'unknown'
}

export interface CustomsTracker {
  code: string
  name: string
  url: string
  hint: string
  verified: boolean
}

/**
 * 통관조회처. House B/L 로 조회되며 Master B/L·선사·입항일·선명/항차·통관진행상태가
 * 한 번에 나온다. 셋 다 딥링크가 안 되므로 페이지를 열고 번호는 클립보드로 넘긴다.
 *
 * 관세청 유니패스가 원본이고 나머지 둘은 그 자료를 재가공한 민간 사이트다.
 * 포워더케이알은 컨테이너 번호를 TCKU6688886 으로 표기했으나 유니패스 원본은
 * TCKU6688885(체크디짓 유효) 였다 — 그래서 유니패스를 기본값으로 둔다.
 */
export const CUSTOMS_TRACKERS: CustomsTracker[] = [
  {
    code: 'UNIPASS',
    name: '관세청 유니패스',
    url: 'https://unipass.customs.go.kr/csp/index.do?tgMenuId=MYC_MNU_00000450',
    hint: 'M B/L 칸에 넣어 안 나오면 H B/L 칸에 넣는다. 보관주기 정책상 최근 3년 건만 조회된다.',
    verified: true,
  },
  {
    code: 'TRADLINX',
    name: '트레드링스',
    url: 'https://www.tradlinx.com/ko/unipass',
    hint: '유니패스 자료를 그대로 보여주는 민간 사이트. [House B/L] 탭 선택 후 입항연도를 맞춘다.',
    verified: true,
  },
  {
    code: 'FORWARDER_KR',
    name: '포워더케이알',
    url: 'https://www.forwarder.kr/curr/index.php?curr=tracking',
    hint: '민간 사이트. 컨테이너 번호를 잘못 표기하는 사례가 확인됐으니 원본은 유니패스로 볼 것.',
    verified: true,
  },
]
