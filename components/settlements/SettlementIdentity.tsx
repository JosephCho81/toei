'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BlLink } from '@/components/tracking/BlLink'

type Container = { bl_no: string | null; mbl_no: string | null; carrier: string | null }
type Identity = { round_no: number | null; round_label: string; order_no: string | null; containers: Container[] | null }

/**
 * 정산 화면 제목 옆의 차수 · P/O · B/L — 서류 대조용 (담당자 2026-09-22).
 * B/L 은 한 차수에 여러 건일 수 있어(37차 LC 2건 등) 같은 번호만 합쳐 모두 보인다.
 */
export function SettlementIdentity({ transactionId }: { transactionId: string }) {
  const [supabase] = useState(createClient)
  const [data, setData] = useState<Identity | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('transactions')
      .select('round_no, round_label, order_no, containers(bl_no, mbl_no, carrier)')
      .eq('id', transactionId)
      .single()
      .then(({ data: row, error: e }) => {
        if (e) setError(e.message)
        else setData(row as Identity)
      })
  }, [supabase, transactionId])

  // 읽기 실패를 빈 칸으로 삼키지 않는다 — B/L 이 없는 차수와 못 읽은 차수를 구분해야 한다
  if (error) return <p className="text-sm text-red-700">차수 정보를 읽지 못했습니다: {error}</p>
  if (!data) return null

  const seen = new Set<string>()
  const bls = (data.containers ?? []).filter((c) => {
    const key = c.bl_no || c.mbl_no
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
      <div className="flex gap-1.5">
        <dt className="text-muted-foreground">차수</dt>
        <dd className="font-semibold">{data.round_no != null ? `${data.round_no}차` : data.round_label}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted-foreground">P/O</dt>
        <dd className="font-semibold tabular-nums">{data.order_no ?? '-'}</dd>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <dt className="text-muted-foreground">B/L</dt>
        <dd className="flex flex-wrap gap-x-3 font-semibold tabular-nums">
          {bls.length === 0 ? '-' : bls.map((c) => (
            <BlLink key={c.bl_no || c.mbl_no} blNo={c.bl_no} mblNo={c.mbl_no} carrierName={c.carrier} />
          ))}
        </dd>
      </div>
    </dl>
  )
}
