/**
 * 관세청 유니패스 오픈API — API012 관세환율 정보 (trifFxrtInfoQry).
 *
 * 여기서 나오는 환율이 곧 통관환율(과세환율)이다. 주 단위로 고시되며
 * 수입신고일이 속한 주의 환율이 적용된다.
 *
 * 스펙 출처: _source_docs/MYC_OpenAPI 연계가이드_v4.1.docx
 *  - 요청: crkyCn(인증키), qryYymmDd(조회년월일 8자리, 필수), imexTp(1:수출, 2:수입, 필수)
 *  - 응답: trifFxrtInfoQryRsltVo 반복 — currSgn(통화부호), fxrt(환율),
 *          aplyBgnDt(적용개시일자), cntySgn(국가부호), mtryUtNm(화폐단위명)
 *
 * 검증: 담당자가 수기 입력한 통관환율 42건 중 41건이 이 API 값과 소수점까지 일치했다.
 *       남은 1건(26년 34차)은 환율이 아니라 통관일 입력이 잘못된 경우였다.
 */

const ENDPOINT =
  'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo'

export interface CustomsRate {
  currency: string
  /** 원/외화 환율 */
  rate: number
  /** 적용개시일자 'YYYY-MM-DD' — 이 주의 환율이라는 뜻 */
  appliedFrom: string | null
}

export type CustomsRateResult =
  | { ok: true; rate: CustomsRate }
  | { ok: false; reason: 'no_key' | 'not_found' | 'error'; message: string }

function toIsoDate(raw: string | undefined): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  return d.length >= 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null
}

/**
 * 수입신고일(customsDate) 기준 통관환율을 가져온다.
 * currency 는 통화부호(기본 USD).
 */
export async function fetchCustomsRate(params: {
  customsDate: string | null | undefined
  currency?: string
  apiKey: string | undefined
}): Promise<CustomsRateResult> {
  const { customsDate, currency = 'USD', apiKey } = params
  if (!apiKey) {
    return { ok: false, reason: 'no_key', message: 'UNIPASS_API_KEY_FXRATE 가 설정되지 않았습니다.' }
  }
  const yyyymmdd = String(customsDate ?? '').replace(/\D/g, '')
  if (yyyymmdd.length !== 8) {
    return { ok: false, reason: 'error', message: '통관일(수입신고일)이 필요합니다.' }
  }

  const url = new URL(ENDPOINT)
  url.searchParams.set('crkyCn', apiKey)
  url.searchParams.set('qryYymmDd', yyyymmdd)
  url.searchParams.set('imexTp', '2') // 2 = 수입

  let xml: string
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { ok: false, reason: 'error', message: `관세환율 응답 오류 (HTTP ${res.status})` }
    xml = await res.text()
  } catch (e) {
    return { ok: false, reason: 'error', message: `관세환율 호출 실패: ${(e as Error).message}` }
  }

  const notice = /<ntceInfo>([\s\S]*?)<\/ntceInfo>/.exec(xml)?.[1]?.trim() ?? ''
  if (Number(/<tCnt>(-?\d+)<\/tCnt>/.exec(xml)?.[1] ?? '0') < 0) {
    return { ok: false, reason: 'error', message: notice || '관세청이 요청을 거부했습니다.' }
  }

  const want = currency.toUpperCase()
  for (const m of xml.matchAll(/<trifFxrtInfoQryRsltVo>([\s\S]*?)<\/trifFxrtInfoQryRsltVo>/g)) {
    const body = m[1]
    if (/<currSgn>([^<]*)<\/currSgn>/.exec(body)?.[1]?.trim().toUpperCase() !== want) continue
    const rate = Number(/<fxrt>([\d.]+)<\/fxrt>/.exec(body)?.[1])
    if (!Number.isFinite(rate)) break
    return {
      ok: true,
      rate: {
        currency: want,
        rate,
        appliedFrom: toIsoDate(/<aplyBgnDt>(\d+)<\/aplyBgnDt>/.exec(body)?.[1]),
      },
    }
  }

  return { ok: false, reason: 'not_found', message: notice || `${yyyymmdd} 의 ${want} 관세환율을 찾지 못했습니다.` }
}
