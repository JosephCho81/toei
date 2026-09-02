'use client'

import { useState } from 'react'
import { ExternalLink, Check } from 'lucide-react'
import { resolveTracking } from '@/lib/tracking/carriers'

/**
 * 목록·상세에서 B/L 번호를 그대로 조회 링크로 쓴다.
 *
 * 어디로 보낼지는 `resolveTracking` 한 곳에서 정한다 (입력폼도 같은 함수를 쓴다).
 * 딥링크가 되는 선사는 조회 결과까지 바로 열리고, 안 되는 곳은 번호를 클립보드에
 * 넣고 조회 페이지만 연다 — 붙여넣기만 하면 되도록.
 */
export function BlLink({ blNo, mblNo, carrierName }: {
  blNo: string | null | undefined
  mblNo?: string | null
  carrierName?: string | null
  /** @deprecated 컨테이너는 재사용돼 다른 화물이 조회된다 — 선사 판별에 쓰지 않는다 */
  containerNo?: string | null
}) {
  const [copied, setCopied] = useState(false)
  const target = resolveTracking({ blNo, mblNo, carrierName })
  if (!target) return <span className="text-muted-foreground">-</span>

  const title = [
    target.targetName,
    target.reason,
    target.deepLink ? null : `클릭하면 ${target.queryNo} 이(가) 복사된다 — 조회창에 붙여넣기`,
    target.hint,
  ].filter(Boolean).join('\n')

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(target!.queryNo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* 클립보드가 막혀도 조회 페이지는 연다 */ }
    window.open(target!.href, '_blank', 'noopener,noreferrer')
  }

  return (
    <a
      href={target.href}
      onClick={handleClick}
      title={title}
      className="inline-flex items-center gap-1 font-mono text-xs hover:underline"
      style={{ color: target.via === 'carrier' ? '#2E7D32' : '#B26A00' }}
    >
      {blNo}
      {copied
        ? <Check className="h-3 w-3 shrink-0 text-green-700" />
        : <ExternalLink className="h-3 w-3 shrink-0" />}
    </a>
  )
}
