'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roundName, type PaymentAlerts as Alerts, type PaymentRow } from '@/lib/data/payments'

/**
 * 확인이 필요한 항목 알림.
 *
 * 닫기 버튼을 두지 않는다. 조건이 사라져야 없어진다 —
 * 2차 미입금이 1,500일 넘게 잊힌 것이 「나중에 보자」의 결과였다.
 *
 * **사유를 적은 건은 배너에서 내려간다** (담당자 2026-09-07: 「지급 메모란 있으니까
 * 그쪽으로 넘길 수는 없어? 이거 너무 눈에 거슬려」). 비고에 사정이 적혀 있으면
 * 그건 이미 사람이 본 건이라 매번 빨갛게 외칠 이유가 없다 — 대신 「메모로 정리됨」으로
 * 접어 두고 건수는 남긴다. 지우지 않는 이유는 위와 같다. 조건이 사라져야 없어진다.
 *
 * 문장은 대표가 그대로 읽을 수 있게 쓴다. 「배분」·「미배분」 같은 내부 용어를 쓰지 않는다.
 * 돈은 한국에이원 → 토에이산교로 가고, 화면은 에이원 기준이라 「나갔다」로 적는다.
 */

interface Item {
  text: string
  href?: string
  action?: string
  /** 차수에 적힌 사유. 있으면 접힌 쪽으로 간다 */
  note?: string | null
  /** 어느 차수 이야기인가 — 접힌 목록에서 「35차 · 사유」로 읽힌다 */
  round?: string
}

/** 통장 원장 쪽 문제는 차수가 없어 메모를 붙일 곳도 없다. 늘 펼친 쪽에 남는다. */
function noteOf(r: PaymentRow): string | null {
  return r.note && r.note.trim() !== '' ? r.note : null
}

export function PaymentAlerts({ alerts }: { alerts: Alerts }) {
  const [openPending, setOpenPending] = useState(false)
  const [openNoted, setOpenNoted] = useState(false)

  const items: Item[] = []

  for (const r of alerts.noRecord) {
    items.push({
      text: `${roundName(r)} 미지급 ${r.balanceKrw.toLocaleString('ko-KR')}원 — `
        + `지급기일 ${r.delayDays?.toLocaleString('ko-KR')}일 경과, 지급 내역 없음`,
      href: `/transactions/${r.transactionId}`,
      action: '거래 보기',
      note: noteOf(r),
      round: roundName(r),
    })
  }
  if (alerts.overpaid.length > 0) {
    // 초과 지급은 차수마다 사정이 다르다 — 한 줄로 묶으면 하나만 설명이 적혀도
    // 전부 미확인으로 남는다. 차수별로 세운다.
    for (const r of alerts.overpaid) {
      items.push({
        text: `${roundName(r)} 청구금액 대비 ${(-r.balanceKrw).toLocaleString('ko-KR')}원 `
          + '초과 지급 — 차기 차수 상계 여부 확인 필요',
        href: `/transactions/${r.transactionId}`,
        action: '거래 보기',
        note: noteOf(r),
        round: roundName(r),
      })
    }
  }
  for (const r of alerts.billedMissing) {
    items.push({
      text: `${roundName(r)} 지급액 ${Math.round(r.paidKrw).toLocaleString('ko-KR')}원 — `
        + '청구금액 미등록으로 대사 불가',
      href: `/transactions/${r.transactionId}`,
      action: '거래 보기',
      note: noteOf(r),
      round: roundName(r),
    })
  }
  if (alerts.unallocated.length > 0) {
    items.push({
      text: `차수 미지정 입출금 ${alerts.unallocated.length}건 `
        + `(${alerts.unallocatedKrw.toLocaleString('ko-KR')}원)`,
      href: '/payments/ledger',
      action: '통장 원장에서 처리',
    })
  }
  if (alerts.unconfirmedPayments > 0) {
    items.push({
      text: `복수 차수 일괄 이체 ${alerts.unconfirmedPayments}건 — 차수별 금액 확인 필요`,
      href: '/payments/ledger',
      action: '통장 원장에서 처리',
    })
  }

  if (items.length === 0) return null

  const pending = items.filter((it) => !it.note)
  const noted = items.filter((it) => it.note)

  return (
    <div className="rounded-md border bg-card px-4 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {pending.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpenPending((v) => !v)}
            className="inline-flex items-center gap-1 font-semibold"
          >
            <Chevron open={openPending} />
            확인 필요 <span className="text-red-700">{pending.length}건</span>
            <span className="font-normal text-muted-foreground">(사유 미기재)</span>
          </button>
        ) : (
          <span className="font-semibold">확인 필요 항목 없음</span>
        )}

        {noted.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenNoted((v) => !v)}
            className="inline-flex items-center gap-1 text-muted-foreground"
          >
            <Chevron open={openNoted} />
            비고 기재 완료 {noted.length}건
          </button>
        )}

        <span className="ml-auto text-muted-foreground">
          차수 비고에 사유를 기재하면 확인 필요 목록에서 제외됩니다
        </span>
      </div>

      {openPending && pending.length > 0 && <ItemList items={pending} />}

      {openNoted && noted.length > 0 && (
        <ItemList items={noted} muted />
      )}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return open
    ? <ChevronDown className="h-4 w-4 text-slate-400" />
    : <ChevronRight className="h-4 w-4 text-slate-400" />
}

/**
 * 펼친 목록. 사유가 적힌 건은 그 사유를 같이 보여준다 —
 * 「왜 남아 있는가」를 보러 다른 화면으로 갈 필요가 없어야 접어 둔 보람이 있다.
 */
function ItemList({ items, muted = false }: { items: Item[]; muted?: boolean }) {
  return (
    <ul className={cn('mt-2 space-y-1.5 border-t pt-2', muted ? 'text-muted-foreground' : 'text-slate-800')}>
      {items.map((it, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-2">
          <span>· {it.text}</span>
          {it.href && (
            <Link href={it.href} className="underline underline-offset-2">{it.action}</Link>
          )}
          {it.note && (
            <span className="w-full pl-3 text-muted-foreground">
              비고 · {it.note.split('\n').filter((l) => l.trim() !== '').join(' / ')}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
