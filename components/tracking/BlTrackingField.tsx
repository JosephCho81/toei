'use client'

import { useState } from 'react'
import { ExternalLink, Check, Download, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CARRIERS, CUSTOMS_TRACKERS, detectCarrier, detectBlKind, getCarrier,
  trackingHref, normalizeTrackingNo,
} from '@/lib/tracking/carriers'
import type { UnipassCargo, UnipassCargoBrief, UnipassResult } from '@/lib/tracking/unipass'

export interface UnipassFill {
  eta?: string
  mblNo?: string
  carrierName?: string
  vesselName?: string
  voyageNo?: string
  containerNo?: string
}

interface Props {
  /** 토에이가 주는 번호 하나. House 든 Master 든 유니패스가 둘 다 받는다. */
  blNo: string
  onBlNoChange: (v: string) => void
  /** 유니패스가 알려준 Master B/L. 입력칸이 아니라 조회 결과다. */
  mblNo?: string | null
  carrierName: string
  onCarrierNameChange: (v: string) => void
  containerNo?: string | null
  /** 유니패스 조회 연도. 없으면 자동조회를 못 한다. */
  blYear?: string | null
  onUnipassResult?: (fill: UnipassFill, cargo: UnipassCargo) => void
}

/**
 * B/L 번호 한 칸.
 *
 * 담당자는 토에이가 준 번호가 House 인지 Master 인지 알 필요가 없다.
 * 앞 4자리로 판별해 조회처만 알아서 고른다:
 *  - House B/L(KULFE… 등) → 선사 시스템에 없다. 관세청 유니패스로.
 *  - 선사 B/L(KMTC… 등)   → 해당 선사 사이트로.
 * Master B/L 은 유니패스 조회 결과로 따라오므로 따로 받지 않는다.
 */
export function BlTrackingField({
  blNo, onBlNoChange, mblNo,
  carrierName, onCarrierNameChange, containerNo,
  blYear, onUnipassResult,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [customsCode, setCustomsCode] = useState(CUSTOMS_TRACKERS[0].code)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // 유니패스가 다건을 돌려주면 담당자가 골라야 상세를 받을 수 있다.
  const [choices, setChoices] = useState<UnipassCargoBrief[]>([])

  const kind = detectBlKind(blNo)
  const detected = detectCarrier(blNo, containerNo)
  const carrier = getCarrier(carrierName) ?? detected
  const customs = CUSTOMS_TRACKERS.find((c) => c.code === customsCode) ?? CUSTOMS_TRACKERS[0]

  // 선사 사이트는 House B/L 을 모른다. Master B/L 을 알아냈을 때만 선사로 보낸다.
  const carrierNo = kind === 'carrier' ? blNo : (mblNo ?? '')
  const useCustoms = !carrierNo || !carrier
  const href = useCustoms ? customs.url : trackingHref(carrier!, carrierNo)
  const deepLinks = !useCustoms && Boolean(carrier?.deepLink)
  const copyNo = useCustoms ? blNo : carrierNo

  async function handleOpen() {
    if (!deepLinks && copyNo) {
      try {
        await navigator.clipboard.writeText(normalizeTrackingNo(copyNo))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch { /* 클립보드가 막혀도 페이지는 연다 */ }
    }
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function handleFetch(cargoNo?: string) {
    if (!blYear && !cargoNo) return
    setLoading(true)
    setMessage(null)
    setChoices([])
    try {
      const res = await fetch('/api/unipass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blNo, blYear, cargoNo: cargoNo ?? null }),
      })
      const data: UnipassResult = await res.json()
      if (!data.ok) {
        setMessage({
          ok: false,
          text: data.reason === 'no_key'
            ? '유니패스 인증키가 등록되지 않았습니다 (UNIPASS_API_KEY_CARGO).'
            : data.message,
        })
        return
      }
      if ('multiple' in data) {
        setChoices(data.multiple)
        setMessage({ ok: true, text: data.message })
        return
      }
      const c = data.cargo
      onUnipassResult?.({
        eta: c.arrivalDate ?? undefined,
        mblNo: c.masterBlNo ?? undefined,
        carrierName: c.carrierName ?? undefined,
        vesselName: c.vesselName ?? undefined,
        voyageNo: c.voyageNo ?? undefined,
        containerNo: c.containerNo ?? undefined,
      }, c)
      const summary = [c.carrierName, c.vesselName && `${c.vesselName} ${c.voyageNo ?? ''}`.trim(),
        c.arrivalDate && `입항 ${c.arrivalDate}`, c.customsStatus,
        c.loadingPort && c.dischargePort && `${c.loadingPort} → ${c.dischargePort}`,
      ].filter(Boolean).join(' · ')
      setMessage({ ok: true, text: summary || '조회됐으나 채울 값이 없습니다.' })
    } catch (e) {
      setMessage({ ok: false, text: `조회 실패: ${(e as Error).message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Input
          className="font-mono flex-1"
          value={blNo}
          onChange={(e) => onBlNoChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
          placeholder="KULFE2600710"
        />
        {onUnipassResult && (
          <Button
            type="button" size="sm" className="shrink-0"
            disabled={!blNo || !blYear || loading}
            onClick={() => handleFetch()}
            title={blYear ? '유니패스에서 입항일·선사·Master B/L 을 가져온다' : 'ETA 또는 ETD 연도가 있어야 조회할 수 있다'}
          >
            {loading
              ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />조회 중</>
              : <><Download className="h-3.5 w-3.5 mr-1" />유니패스 조회</>}
          </Button>
        )}
        <Button
          type="button" variant="outline" size="sm" className="shrink-0"
          disabled={!blNo} onClick={handleOpen}
        >
          {copied
            ? <><Check className="h-3.5 w-3.5 mr-1" />복사됨</>
            : <><ExternalLink className="h-3.5 w-3.5 mr-1" />사이트 열기</>}
        </Button>
      </div>

      {blNo.length >= 4 && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {kind === 'house' && <span className="text-green-700 font-medium">House B/L{carrier && ` · ${carrier.name}`} — 선사 시스템에 없어 유니패스로 조회한다. </span>}
          {kind === 'carrier' && <span className="text-green-700 font-medium">선사 B/L — {carrier?.name} 사이트로 연결된다. </span>}
          {kind === 'unknown' && <span>앞 4자리 <span className="font-mono">{normalizeTrackingNo(blNo).slice(0, 4)}</span> 로는 종류를 알 수 없어 유니패스로 연결한다. </span>}
          {mblNo && <>Master B/L <span className="font-mono">{mblNo}</span> · </>}
          {!deepLinks && '사이트 열기를 누르면 번호가 복사된다.'}
        </p>
      )}

      {choices.length > 0 && (
        <div className="rounded border divide-y text-xs">
          <p className="px-2 py-1.5 bg-muted text-muted-foreground">여러 건이 조회됐습니다. 해당 화물을 고르세요.</p>
          {choices.map((c) => (
            <button
              key={c.cargoNo ?? `${c.masterBlNo}-${c.houseBlNo}`}
              type="button"
              className="w-full text-left px-2 py-1.5 hover:bg-green-50"
              onClick={() => c.cargoNo && handleFetch(c.cargoNo)}
            >
              <span className="font-mono">{c.cargoNo}</span>
              {' · '}{[c.arrivalDate && `입항 ${c.arrivalDate}`, c.dischargePort, c.carrierName].filter(Boolean).join(' · ')}
            </button>
          ))}
        </div>
      )}

      {message && (
        <p className={`text-xs rounded border px-2 py-1.5 ${message.ok
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {message.text}
        </p>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">조회처</span>
        <Select
          value={useCustoms ? customsCode : (carrier?.code ?? '')}
          onValueChange={(v) => {
            if (!v) return
            if (CUSTOMS_TRACKERS.some((c) => c.code === v)) setCustomsCode(v)
            else onCarrierNameChange(getCarrier(v)?.name ?? v)
          }}
        >
          <SelectTrigger className="w-60 h-8 text-xs"><SelectValue placeholder="자동" /></SelectTrigger>
          <SelectContent>
            {CUSTOMS_TRACKERS.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.name} (통관)</SelectItem>
            ))}
            {CARRIERS.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
