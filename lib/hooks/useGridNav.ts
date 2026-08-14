'use client'
import { useCallback } from 'react'
import type { KeyboardEvent } from 'react'

/**
 * 표 형태 입력에서 ↑/↓(및 Enter)로 같은 열의 위·아래 칸으로 이동.
 * Tab(가로 이동)은 브라우저 기본 동작을 그대로 쓴다.
 *
 * gridId 는 한 화면에 표가 둘 이상일 때 셀 충돌을 막기 위한 값.
 */
export function useGridNav(gridId: string) {
  const focusCell = useCallback((row: number, col: number): boolean => {
    const el = document.querySelector<HTMLElement>(
      `[data-grid="${gridId}"][data-grid-cell="${row}:${col}"]`
    )
    if (!el) return false
    el.focus()
    if (el instanceof HTMLInputElement && el.type !== 'checkbox') el.select()
    return true
  }, [gridId])

  const cellProps = useCallback((row: number, col: number) => ({
    'data-grid': gridId,
    'data-grid-cell': `${row}:${col}`,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.key === 'ArrowUp') {
        // number 입력의 값 증감 기본동작도 함께 막는다
        e.preventDefault()
        focusCell(row - 1, col)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusCell(row + 1, col)
      } else if (e.key === 'Enter') {
        // 폼 안에서 Enter 로 저장이 실행되는 것을 막고 아래 칸으로 이동
        e.preventDefault()
        focusCell(row + 1, col)
      }
    },
  }), [gridId, focusCell])

  return { cellProps, focusCell }
}
