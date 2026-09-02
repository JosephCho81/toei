/**
 * 관세청 유니패스 오픈API — API001 화물통관진행정보 (cargCsclPrgsInfoQry).
 *
 * House B/L 로 조회되는 유일한 공식 경로다. 선사 사이트는 포워더가 끊은 House B/L 을
 * 모르고, 컨테이너 번호는 재사용되므로 다른 화물이 나온다.
 *
 * 스펙 출처: _source_docs/MYC_OpenAPI 연계가이드_v4.1.docx
 *  - 요청: crkyCn(인증키) + cargMtNo | mblNo | hblNo, blYy(입항년도, MBL/HBL 조회 시 필수)
 *  - 응답이 단건이면 상세, 다건이면 목록이 오고 ntceInfo 가 '[N00]' 으로 시작한다.
 *    목록의 화물관리번호로 다시 호출해야 상세를 받는다.
 *  - 보관주기 정책상 '23.06.17 부터 3년 이내 데이터만 조회된다.
 *  - 출항일(ETD)은 제공하지 않는다. 입항일자(etprDt)까지다.
 *
 * 인증키: unipass.customs.go.kr 회원가입 → My메뉴 > 서비스관리 > OpenAPI 사용관리
 *         → UNIPASS_API_KEY_CARGO 환경변수
 */

const ENDPOINT =
  'https://unipass.customs.go.kr:38010/ext/rest/cargCsclPrgsInfoQry/retrieveCargCsclPrgsInfo'

export interface UnipassCargo {
  /** 화물관리번호 (cargMtNo) */
  cargoNo: string | null
  /** 진행상태 (prgsStts) — 예: 반출완료 */
  progressStatus: string | null
  /** 통관진행상태 (csclPrgsStts) — 예: 수입신고수리 */
  customsStatus: string | null
  /** 처리일시 (prcsDttm) */
  processedAt: string | null
  /** 선사항공사 (shcoFlco) — 예: 고려해운(주) */
  carrierName: string | null
  /** 선사항공사부호 (shcoFlcoSgn) */
  carrierSign: string | null
  masterBlNo: string | null
  houseBlNo: string | null
  /** 입항일자 (etprDt) 'YYYY-MM-DD'. 실적이므로 ETA 확정값으로 쓸 수 있다. */
  arrivalDate: string | null
  /** 선박명 (shipNm) */
  vesselName: string | null
  /** 항차 (vydf) */
  voyageNo: string | null
  /** 컨테이너번호 (cntrNo) */
  containerNo: string | null
  /** 컨테이너개수 (cntrGcnt) */
  containerCount: string | null
  /** 적재항명 (ldprNm) / 양륙항명 (dsprNm) */
  loadingPort: string | null
  dischargePort: string | null
  /** 입항세관 (etprCstm) */
  arrivalCustoms: string | null
  /** 품명 (prnm) */
  itemName: string | null
  /** 포장개수 (pckGcnt) + 단위 (pckUt) */
  packageCount: string | null
  packageUnit: string | null
  /** 총중량 (ttwg) + 단위 (wghtUt) */
  grossWeight: string | null
  weightUnit: string | null
  /** 용적 (msrm) */
  measurement: string | null
  /** B/L유형명 (blPtNm) — 예: Consol */
  blTypeName: string | null
  /** 포워더명 (frwrEntsConm) / 대리점 (agnc) */
  forwarderName: string | null
  agentName: string | null
}

/** 다건 조회일 때 돌아오는 목록 한 줄. */
export interface UnipassCargoBrief {
  cargoNo: string | null
  masterBlNo: string | null
  houseBlNo: string | null
  arrivalDate: string | null
  dischargePort: string | null
  carrierName: string | null
}

export type UnipassResult =
  | { ok: true; cargo: UnipassCargo }
  | { ok: true; multiple: UnipassCargoBrief[]; message: string }
  | { ok: false; reason: 'no_key' | 'not_found' | 'error'; message: string }

/** 평면 XML 에서 <tag>값</tag> 을 뽑는다. 이 응답은 한 겹 구조라 파서를 더하지 않는다. */
function parseTags(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/<([A-Za-z][\w]*)>([\s\S]*?)<\/\1>/g)) {
    const value = m[2].trim()
    if (value) out[m[1]] = value
  }
  return out
}

function blocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])
}

/** etprDt 는 'YYYYMMDD' 8자리. */
function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  return d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null
}

export function mapCargo(t: Record<string, string>): UnipassCargo {
  const v = (k: string) => t[k] ?? null
  return {
    cargoNo: v('cargMtNo'),
    progressStatus: v('prgsStts'),
    customsStatus: v('csclPrgsStts'),
    processedAt: v('prcsDttm'),
    carrierName: v('shcoFlco'),
    carrierSign: v('shcoFlcoSgn'),
    masterBlNo: v('mblNo'),
    houseBlNo: v('hblNo'),
    arrivalDate: toIsoDate(t.etprDt),
    vesselName: v('shipNm'),
    voyageNo: v('vydf'),
    containerNo: v('cntrNo'),
    containerCount: v('cntrGcnt'),
    loadingPort: v('ldprNm') ?? v('ldprCd'),
    dischargePort: v('dsprNm') ?? v('dsprCd'),
    arrivalCustoms: v('etprCstm'),
    itemName: v('prnm'),
    packageCount: v('pckGcnt'),
    packageUnit: v('pckUt'),
    grossWeight: v('ttwg'),
    weightUnit: v('wghtUt'),
    measurement: v('msrm'),
    blTypeName: v('blPtNm'),
    forwarderName: v('frwrEntsConm'),
    agentName: v('agnc'),
  }
}

function mapBrief(t: Record<string, string>): UnipassCargoBrief {
  return {
    cargoNo: t.cargMtNo ?? null,
    masterBlNo: t.mblNo ?? null,
    houseBlNo: t.hblNo ?? null,
    arrivalDate: toIsoDate(t.etprDt),
    dischargePort: t.dsprNm ?? t.dsprCd ?? null,
    carrierName: t.shcoFlco ?? null,
  }
}

async function call(apiKey: string, params: Record<string, string>): Promise<UnipassResult> {
  const url = new URL(ENDPOINT)
  url.searchParams.set('crkyCn', apiKey)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let xml: string
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { ok: false, reason: 'error', message: `유니패스 응답 오류 (HTTP ${res.status})` }
    xml = await res.text()
  } catch (e) {
    return { ok: false, reason: 'error', message: `유니패스 호출 실패: ${(e as Error).message}` }
  }

  const notice = /<ntceInfo>([\s\S]*?)<\/ntceInfo>/.exec(xml)?.[1]?.trim() ?? ''
  const count = Number(/<tCnt>(-?\d+)<\/tCnt>/.exec(xml)?.[1] ?? '0')

  if (count < 0) {
    return { ok: false, reason: 'error', message: notice || '유니패스가 요청을 거부했습니다.' }
  }

  const items = blocks(xml, 'cargCsclPrgsInfoQryVo').map(parseTags)

  // 가이드: ntceInfo 가 '[N00]' 으로 시작하면 다건 → 상세가 아니라 목록이 온다.
  if (notice.startsWith('[N00]') || items.length > 1) {
    if (items.length === 0) {
      return { ok: false, reason: 'not_found', message: notice || '조회 결과가 없습니다.' }
    }
    return {
      ok: true,
      multiple: items.map(mapBrief),
      message: notice || `${items.length}건이 조회됐습니다. 화물을 골라주세요.`,
    }
  }

  if (items.length === 0) {
    return {
      ok: false,
      reason: 'not_found',
      message: notice
        || '조회 결과가 없습니다. 입항연도가 맞는지, 입항 후 3년이 지나지 않았는지 확인하세요.',
    }
  }

  return { ok: true, cargo: mapCargo(items[0]) }
}

/**
 * B/L 번호 하나로 조회한다.
 *
 * 담당자는 토에이가 준 번호가 House 인지 Master 인지 알 필요가 없어야 한다.
 * 우리 데이터의 대부분이 House B/L 이므로 hblNo 로 먼저 던지고, 안 나오면 mblNo 로 다시 던진다.
 *
 * blYear 는 입항년도. MBL/HBL 조회 시 필수이며 연도가 어긋나면 다른 화물이 잡힌다.
 */
export async function fetchUnipassCargo(params: {
  blNo?: string | null
  /** 목록에서 고른 화물관리번호. 있으면 이걸로 바로 상세를 받는다. */
  cargoNo?: string | null
  blYear?: string | null
  apiKey: string | undefined
}): Promise<UnipassResult> {
  const { blYear, apiKey } = params
  if (!apiKey) {
    return { ok: false, reason: 'no_key', message: 'UNIPASS_API_KEY_CARGO 가 설정되지 않았습니다.' }
  }

  const cargoNo = String(params.cargoNo ?? '').toUpperCase().replace(/[\s-]/g, '')
  if (cargoNo) return call(apiKey, { cargMtNo: cargoNo })

  const no = String(params.blNo ?? '').toUpperCase().replace(/[\s-]/g, '')
  if (!no) return { ok: false, reason: 'error', message: 'B/L 번호가 없습니다.' }
  if (!blYear || !/^\d{4}$/.test(blYear)) {
    return { ok: false, reason: 'error', message: 'B/L 조회에는 입항년도가 필요합니다.' }
  }

  const first = await call(apiKey, { hblNo: no, blYy: blYear })
  if (first.ok || first.reason !== 'not_found') return first
  return call(apiKey, { mblNo: no, blYy: blYear })
}
