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
    return <span className="whitespace-nowrap text-muted-foreground">+ 비고</span>
  }
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      className="inline-flex items-center whitespace-nowrap font-semibold text-slate-800 hover:underline"
    >
      {/* 열 폭이 표의 8%라 「✓ 비고 4건」이 두 줄로 꺾였다 (담당자 2026-10-02). 아이콘·간격을 줄이고 한 줄로 묶는다 */}
      {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
      <span>✓ 비고{lines.length > 1 && <span className="ml-0.5 font-normal text-muted-foreground">{lines.length}</span>}</span>
    </button>
  )
}

/** NoteCell 을 펼쳤을 때 행 바로 아래 붙는 전폭 줄 */
export function NoteRow({ colSpan, label, note, stamp = null }: {
  colSpan: number
  label: string
  note: string | null
  /** 마지막 저장 「토에이 · 10-02」 — 글 뒤에 작게만 붙인다 (043) */
  stamp?: string | null
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="border-l-4 border-yellow-300 bg-yellow-50 px-6 py-2 text-sm">
        {/* 둘째 줄부터 칸 왼쪽 끝으로 돌아가 라벨 밑에 붙었다 — 줄마다 첫 줄 글머리에 맞춘다 (담당자 2026-10-06) */}
        <div className="flex items-start gap-2">
          <span className="shrink-0 font-semibold text-slate-800">{label}</span>
          <div className="min-w-0 text-slate-700">
            {noteLines(note).map((line, i) => <p key={i} className="break-words">{line}</p>)}
            {stamp && <p className="text-xs text-muted-foreground">{stamp}</p>}
          </div>
        </div>
      </td>
    </tr>
  )
}

function noteLines(note: string | null): string[] {
  return note ? note.split('\n').filter((l) => l.trim() !== '') : []
}
