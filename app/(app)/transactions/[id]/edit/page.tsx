import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import TransactionEditForm from '@/components/transactions/TransactionEditForm'
import { ShipmentsEditSection } from '@/components/transactions/ShipmentsEditSection'
import { DeleteTransactionButton } from '@/components/transactions/DeleteTransactionButton'

export default async function TransactionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: t }, { data: manufacturers }] = await Promise.all([
    supabase.from('transactions').select('*').eq('id', id).single(),
    supabase.from('manufacturers').select('id, name').order('name'),
  ])

  if (!t) notFound()
  if (t.is_locked) redirect(`/transactions/${id}`)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">{t.round_label} 수정</h2>
        <Badge variant="outline">차수 {t.round_no}</Badge>
      </div>
      <TransactionEditForm
        transactionId={id}
        manufacturers={manufacturers ?? []}
        initialData={t}
      />
      <ShipmentsEditSection transactionId={id} />
      <DeleteTransactionButton transactionId={id} roundLabel={t.round_label} />
    </div>
  )
}
