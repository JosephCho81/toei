'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface RateRow { date: string; rate_krw: number; source: string }

export default function ExchangeRatesPage() {
  const supabase = createClient()
  const [rates, setRates] = useState<RateRow[]>([])
  const [bokDate, setBokDate] = useState('')
  const [bokLoading, setBokLoading] = useState(false)
  const [bokMsg, setBokMsg] = useState<string | null>(null)
  const [manualDate, setManualDate] = useState('')
  const [manualRate, setManualRate] = useState('')
  const [manualSaving, setManualSaving] = useState(false)

  const load = useCallback(async () => {
    const since = new Date(); since.setDate(since.getDate() - 30)
    const { data } = await supabase.from('exchange_rate_cache')
      .select('date,rate_krw,source')
      .gte('date', since.toISOString().slice(0, 10))
      .order('date', { ascending: false })
    setRates(data ?? [])
  }, [supabase])

  useEffect(() => {
    async function run() { await load() }
    run()
  }, [load])

  async function fetchBok() {
    if (!bokDate) return
    setBokLoading(true); setBokMsg(null)
    const dateStr = bokDate.replace(/-/g, '')
    const res = await fetch(`/api/exchange-rate?date=${dateStr}`)
    const data = await res.json()
    setBokLoading(false)
    if (data.error) { setBokMsg(`오류: ${data.error}`); return }
    setBokMsg(`${bokDate}: ${data.rate}원/USD (${data.source})`)
    load()
  }

  async function saveManual() {
    if (!manualDate || !manualRate) return
    setManualSaving(true)
    await supabase.from('exchange_rate_cache').upsert({
      date: manualDate,
      rate_krw: parseFloat(manualRate),
      source: 'manual',
    })
    setManualSaving(false); setManualDate(''); setManualRate(''); load()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">환율 관리</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">한국은행 자동 조회</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-sm">날짜</Label>
              <Input type="date" value={bokDate} onChange={e => setBokDate(e.target.value)} />
            </div>
            <Button size="sm" onClick={fetchBok} disabled={bokLoading || !bokDate}>
              {bokLoading ? '조회 중...' : '조회 및 저장'}
            </Button>
            {bokMsg && <p className={`text-xs ${bokMsg.startsWith('오류') ? 'text-destructive' : 'text-green-700'}`}>{bokMsg}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">수동 입력</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-sm">날짜</Label>
                <Input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">환율 (원/USD)</Label>
                <Input type="number" step="0.01" value={manualRate} onChange={e => setManualRate(e.target.value)} placeholder="1350.00" />
              </div>
            </div>
            <Button size="sm" onClick={saveManual} disabled={manualSaving || !manualDate || !manualRate}>
              {manualSaving ? '저장 중...' : '저장'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead className="text-right">환율 (원/USD)</TableHead>
              <TableHead>출처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map(r => (
              <TableRow key={r.date}>
                <TableCell className="font-mono text-sm">{r.date}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {Number(r.rate_krw).toLocaleString('ko-KR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant={r.source === 'manual' ? 'outline' : 'secondary'} className="text-xs">
                    {r.source === 'bok_ecos' ? '한국은행' : r.source === 'cache' ? '캐시' : '수동'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {rates.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">최근 30일 환율 데이터가 없습니다.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
