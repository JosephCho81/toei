'use client'

import { createContext, useContext } from 'react'
import { canEdit, canEditNotes, type Role } from '@/lib/auth/role'

const RoleContext = createContext<Role | null>(null)

/** 레이아웃이 서버에서 읽은 역할을 화면 전체에 내려준다 */
export function RoleProvider({ role, children }: { role: Role | null; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): Role | null {
  return useContext(RoleContext)
}

/** 메모 아닌 입력(금액·항목·지급·잠금·삭제)을 보여도 되는가 */
export function useCanEdit(): boolean {
  return canEdit(useContext(RoleContext))
}

export function useCanEditNotes(): boolean {
  return canEditNotes(useContext(RoleContext))
}
