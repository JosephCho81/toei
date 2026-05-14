import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatUsd } from '@/lib/utils/format'
import Link from 'next/link'

type Item = {
  spec: string | null; size: string | null; unit_price_usd: number | null
  quantity: number | null; unit: string | null; color: string | null; sort_order: number
}
type ContainerRow = { etd: string | null; eta: string | null; eta_source: string | null }

export type TxRow = {
  id: string; round_no: number; round_label: string; order_no: string | null
  lc_open_date: string | null; lc_expiry_date: string | null; a1_payment_date: string | null
  import_amount_usd_actual: number | null; import_amount_usd_theoretical: number | null
  margin_rate_pct: number | null; settlement_status: string; is_locked: boolean
  manufacturers: { name: string } | { name: string }[] | null
  transaction_items: Item[] | null
  containers: ContainerRow[] | null
}

function getMfr(raw: TxRow['manufacturers']): string {
  if (!raw) return '-'
  if (Array.isArray(raw)) return raw[0]?.name ?? '-'
  return (raw as { name: string }).name ?? '-'
}

function pick(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a != null) return Number(a)
  if (b != null) return Number(b)
  return null
}

function minEtd(cs: ContainerRow[]): string | null {
  const d = cs.map(c => c.etd).filter(Boolean) as string[]
  return d.sort()[0] ?? null
}

function maxEtaInfo(cs: ContainerRow[]): { date: string | null; isApi: boolean } {
  const sorted = cs.filter(c => c.eta).sort((a, b) => (a.eta! > b.eta! ? -1 : 1))
  return { date: sorted[0]?.eta ?? null, isApi: sorted[0]?.eta_source === 'api' }
}

const HEADS = [
  '회차','P/O No.','L/C 개설일','입금일(A1)','LC 만기',
  '수입금액(USD)','총판매금액(마진율%)','지불형태','제조사명',
  '스펙','사이즈','단가(USD)','수량','단위','색상/g','ETD','ETA','완료여부',
]

export function TransactionTable({ rows }: { rows: TxRow[] }) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map(h => <TableHead key={h} className="whitespace-nowrap text-xs">{h}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                등록된 거래가 없습니다.
              </TableCell>
            </TableRow>
          )}
          {rows.flatMap(t => {
            const items = [...(t.transaction_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
            const display = items.length > 0 ? items : [null as null]
            const span = display.length
            const usd = pick(t.import_amount_usd_actual, t.import_amount_usd_theoretical)
            const mr = t.margin_rate_pct != null ? Number(t.margin_rate_pct) : null
            const total = usd != null && mr != null ? usd * (1 + mr / 100) : null
            const etd = minEtd(t.containers ?? [])
            const { date: eta, isApi } = maxEtaInfo(t.containers ?? [])
            const done = t.settlement_status === 'closing_done'

            return display.map((item, idx) => {
              const first = idx === 0
              const sep = 'border-t border-dashed border-muted-foreground/25'
              const ic = `text-sm${idx > 0 ? ` ${sep}` : ''}`
              return (
                <TableRow key={`${t.id}-${idx}`}>
                  {first && <>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm font-medium align-top">
                      <Link href={`/transactions/${t.id}`} className="hover:underline">{t.round_label}</Link>
                    </TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">{t.order_no ?? '-'}</TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">{formatDate(t.lc_open_date)}</TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">{formatDate(t.a1_payment_date)}</TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">{formatDate(t.lc_expiry_date)}</TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap font-mono text-sm align-top">
                      {usd != null ? formatUsd(usd) : '-'}
                    </TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">
                      {total != null
                        ? <>{formatUsd(total)}<span className="ml-1 text-xs text-muted-foreground">({mr}%)</span></>
                        : '-'}
                    </TableCell>
                    <TableCell rowSpan={span} className="text-sm align-top">-</TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">{getMfr(t.manufacturers)}</TableCell>
                  </>}
                  <TableCell className={ic}>{item?.spec ?? '-'}</TableCell>
                  <TableCell className={ic}>{item?.size ?? '-'}</TableCell>
                  <TableCell className={`${ic} whitespace-nowrap font-mono`}>
                    {item?.unit_price_usd != null ? formatUsd(Number(item.unit_price_usd)) : '-'}
                  </TableCell>
                  <TableCell className={ic}>{item?.quantity ?? '-'}</TableCell>
                  <TableCell className={ic}>{item?.unit ?? '-'}</TableCell>
                  <TableCell className={ic}>{item?.color ?? '-'}</TableCell>
                  {first && <>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">{formatDate(etd)}</TableCell>
                    <TableCell rowSpan={span} className="whitespace-nowrap text-sm align-top">
                      {formatDate(eta)}
                      {isApi && (
                        <Badge className="ml-1 text-xs bg-blue-500 hover:bg-blue-600 text-white py-0">자동</Badge>
                      )}
                    </TableCell>
                    <TableCell rowSpan={span} className="align-top">
                      <Badge variant={done ? 'default' : 'secondary'}>{done ? '완료' : '진행중'}</Badge>
                    </TableCell>
                  </>}
                </TableRow>
              )
            })
          })}
        </TableBody>
      </Table>
    </div>
  )
}
