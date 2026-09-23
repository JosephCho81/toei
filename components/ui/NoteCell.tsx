'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * 표에 보이는 비고 한 칸 — 정산 비교·지급 현황이 같은 칸(interim/closing notes)을 같은 모양으로 보인다.
 * 내용은 접어 두고 **있다는 것만** 「✓ 비고」로 굵게 말한다. 긴 메모를 첫 줄만 잘라 세우면
 * 읽히지도 않고 표만 어지럽다 (담당자 2026-09-22). 누르면 그 칸에서만 펼친다 — 행 클릭과는 따로다.
 * 빈 칸에 「+ 비고」를 남겨 두는 이유는, 아이콘만 있으면 적을 수 있는 줄인 줄도 모르기 때문이다.
 */
export function NoteCell({ note }: { note: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const lines = note ? note.split('\n').filter((l) => l.trim() !== '') : []
  if (lines.length === 0) {
    return <span className="text-muted-foreground">+ 비고</span>
  }
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:underline"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        ✓ 비고 {lines.length > 1 && <span className="font-normal text-muted-foreground">{lines.length}건</span>}
      </button>
      {expanded && (
        <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{lines.join('\n')}</p>
      )}
    </div>
  )
}
