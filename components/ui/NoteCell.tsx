'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * 표에 보이는 비고 한 칸. 내용은 접어 두고 **있다는 것만** 「✓ 비고」로 굵게 말한다 (담당자 2026-09-22).
 * 펼친 내용은 칸 안이 아니라 행 아래 표 전체 너비 줄(NoteRow)에 편다 — 좁은 칸에서 펼치면
 * 글자가 세로로 쌓여 행이 너무 길어진다 (담당자 2026-09-30). 그래서 열림 상태는 표가 쥔다.
 * 빈 칸에 「+ 비고」를 남겨 두는 이유는, 아이콘만 있으면 적을 수 있는 줄인 줄도 모르기 때문이다.
 */
export function NoteCell({
  note,
  expanded,
  onToggle,
}: {
  note: string | null
  expanded: boolean
  onToggle: () => void
}) {
  const lines = noteLines(note)
  if (lines.length === 0) {
    return <span className="text-muted-foreground">+ 비고</span>
  }
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:underline"
    >
      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      ✓ 비고 {lines.length > 1 && <span className="font-normal text-muted-foreground">{lines.length}건</span>}
    </button>
  )
}

/** NoteCell 을 펼쳤을 때 행 바로 아래 붙는 전폭 줄 */
export function NoteRow({ colSpan, label, note }: { colSpan: number; label: string; note: string | null }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border-l-4 border-yellow-300 bg-yellow-50 px-6 py-2 text-sm">
        <span className="mr-2 font-semibold text-slate-800">{label}</span>
        <span className="whitespace-pre-wrap break-words text-slate-700">{noteLines(note).join('\n')}</span>
      </td>
    </tr>
  )
}

function noteLines(note: string | null): string[] {
  return note ? note.split('\n').filter((l) => l.trim() !== '') : []
}
