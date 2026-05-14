'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

const ROLES = [['a1_admin','관리자'],['a1_user','에이원 직원'],['toei_user','토에이 직원'],['viewer','조회만']]

interface User {
  id: string; email?: string
  user_metadata: { role?: string; name?: string; company?: string }
  banned_until?: string | null
  created_at: string
}

interface Props { initialUsers: User[] }

export function UserManagement({ initialUsers }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  async function reload() {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data.users ?? [])
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setUsers(u => u.map(x => x.id === id ? { ...x, user_metadata: { ...x.user_metadata, role } } : x))
  }

  async function toggleBan(id: string, banned: boolean) {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned }),
    })
    reload()
  }

  async function handleInvite() {
    if (!inviteEmail) return
    setInviting(true); setInviteMsg(null)
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const data = await res.json()
    setInviting(false)
    if (data.error) { setInviteMsg(`오류: ${data.error}`); return }
    setInviteMsg(`${inviteEmail} 에 초대 메일을 발송했습니다.`)
    setInviteEmail(''); reload()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">사용자 초대</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">이메일</label>
            <Input className="w-64" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">역할</label>
            <Select value={inviteRole} onValueChange={v => v && setInviteRole(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>{inviting ? '발송 중...' : '초대 발송'}</Button>
          {inviteMsg && <p className={`text-sm ${inviteMsg.startsWith('오류') ? 'text-destructive' : 'text-green-700'}`}>{inviteMsg}</p>}
        </CardContent>
      </Card>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이메일</TableHead><TableHead>이름</TableHead>
              <TableHead>회사</TableHead><TableHead>역할</TableHead>
              <TableHead>상태</TableHead><TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => {
              const isBanned = u.banned_until && u.banned_until !== 'none'
              return (
                <TableRow key={u.id} className={isBanned ? 'opacity-50' : ''}>
                  <TableCell className="text-sm">{u.email ?? '-'}</TableCell>
                  <TableCell className="text-sm">{u.user_metadata?.name ?? '-'}</TableCell>
                  <TableCell className="text-sm">{u.user_metadata?.company ?? '-'}</TableCell>
                  <TableCell>
                    <Select value={u.user_metadata?.role ?? ''} onValueChange={v => v && updateRole(u.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="미설정" /></SelectTrigger>
                      <SelectContent>{ROLES.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant={isBanned ? 'secondary' : 'default'} className="text-xs">{isBanned ? '비활성' : '활성'}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleBan(u.id, !isBanned)}>
                      {isBanned ? '활성화' : '비활성화'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {users.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">사용자가 없습니다. (SUPABASE_SERVICE_ROLE_KEY 확인 필요)</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
