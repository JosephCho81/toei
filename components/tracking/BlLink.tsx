'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  CUSTOMS_TRACKERS, detectBlKind, detectCarrier, getCarrier,
  trackingHref, normalizeTrackingNo,
} from '@/lib/tracking/carriers'

/**
 * 목록·상세에서 B/L 번호를 그대로 조회 링크로 쓴다.
 *
 * House B/L 은 선사 사이트에 없으므로 통관조회(포워더케이알)로 보내고,
 * 선사 B/L·Master B/L 이 있으면 선사 사이트로 보낸다.
 * 딥링크가 안 되는 곳은 번호를 클립보드에 넣고 페이지만 연다.
 */
export function BlLink({ blNo, mblNo, carrierName, containerNo }: {
  blNo: string | null | undefined
  mblNo?: string | null
  carrierName?: string | null
  containerNo?: string | null
}) {
  const [copied, setCopied] = useState(false)
  if (!blNo) return <span className="text-muted-foreground">-</span>

  const kind = detectBlKind(blNo)
  const carrier = getCarrier(carrierName) ?? detectCarrier(blNo, containerNo)

  // House B/L 이면서 Master B/L 이 없으면 통관조회가 유일한 길이다.
  const useCustoms = kind === 'house' && !mblNo
  const queryNo = useCustoms ? blNo : (kind === 'house' ? mblNo! : blNo)
  const href = useCustoms
    ? CUSTOMS_TRACKERS[0].url
    : carrier ? trackingHref(carrier, queryNo) : null

  if (!href) return <span className="font-mono text-xs">{blNo}</span>

  const deepLinks = !useCustoms && Boolean(carrier?.deepLink)
  const target = useCustoms ? '통관조회 (포워더케이알)' : `${carrier?.name} 화물추적`

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (!deepLinks) {
      try {
        await navigator.clipboard.writeText(normalizeTrackingNo(queryNo))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* 클립보드가 막혀도 조회 페이지는 연다 */ }
    }
    window.open(href!, '_blank', 'noopener,noreferrer')
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      title={`${target}${deepLinks ? '' : ` — ${normalizeTrackingNo(queryNo)} 복사됨, 붙여넣기`}`}
      className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
      style={{ color: '#2E7D32' }}
    >
      {blNo}
      <ExternalLink className="h-3 w-3 shrink-0" />
      {copied && <span className="text-[10px] text-green-700">복사됨</span>}
    </a>
  )
}
