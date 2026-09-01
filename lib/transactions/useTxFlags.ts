'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { TxFlag } from '@/types/transaction'

const FLAG_SELECT = 'id,transaction_id,field,memo,status,resolved_memo,created_at'

/**
 * 거래 목록의 「오류」 체크 상태.
 * 체크 해제는 삭제가 아니라 `resolved` 전환이다 — 무엇이 왜 틀렸었는지 이력이 남아야 한다.
 */
export function useTxFlags(initialFlags: TxFlag[]) {
  const [supabase] = useState(createClient)
  const [flags, setFlags] = useState<TxFlag[]>(initialFlags)

  const flagsOf = (txId: string) => flags.filter((f) => f.transaction_id === txId)

  const replaceFlagsOf = (txId: string, next: TxFlag[]) =>
    setFlags((p) => [...p.filter((f) => f.transaction_id !== txId), ...next])

  /** 체크했으면 true, 아무 일도 하지 않았으면 false (호출부가 행을 펼칠지 결정한다). */
  async function toggleError(txId: string, checked: boolean): Promise<boolean> {
    const current = flagsOf(txId)
    const openFlags = current.filter((f) => f.status === 'open')

    if (checked) {
      if (openFlags.length > 0) return false
      const { data, error } = await supabase.from('transaction_flags')
        .insert({ transaction_id: txId, field: '기타' })
        .select(FLAG_SELECT)
        .single()
      if (error || !data) {
        toast.error(`오류 표시 실패: ${error?.message ?? '알 수 없는 오류'}`)
        return false
      }
      replaceFlagsOf(txId, [...current, data as TxFlag])
      return true
    }

    if (openFlags.length === 0) return false
    replaceFlagsOf(txId, current.map((f) => f.status === 'open' ? { ...f, status: 'resolved' } : f))
    const { error } = await supabase.from('transaction_flags')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .in('id', openFlags.map((f) => f.id))
    if (error) toast.error(`처리 실패: ${error.message}`)
    return false
  }

  return { flagsOf, replaceFlagsOf, toggleError }
}
