import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Plus, Download } from 'lucide-react'
import { TransactionTable, type TxRow } from './transactions-table'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('transactions')
    .select(`
      id, round_no, round_label, order_no, lc_open_date, lc_expiry_date,
      a1_payment_date, import_amount_usd_actual, import_amount_usd_theoretical,
      margin_rate_pct, settlement_status, is_locked,
      manufacturers(name),
      transaction_items(spec, size, glove_type, unit_price_usd, quantity, unit, color, sort_order),
      containers(etd, eta, eta_source)
    `)
    .order('round_no', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">거래 목록</h2>
        <div className="flex gap-2">
          <a
            href="/api/export/transactions"
            download
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Download className="h-4 w-4 mr-1" />엑셀 다운로드
          </a>
          <Link href="/transactions/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4 mr-1" />새 거래 등록
          </Link>
        </div>
      </div>
      <TransactionTable rows={(data ?? []) as unknown as TxRow[]} />
    </div>
  )
}
