'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { SettlementPdfButton } from '@/components/settlements/SettlementPdfButton'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  roundLabel: string
  orderNo: string | null
  transactionId: string
  interimId: string | null
  closingId: string | null
  interimLocked: boolean
  closingLocked: boolean
}

export function ReportHeader({
  roundLabel, orderNo, transactionId,
  interimId, closingId, interimLocked, closingLocked,
}: Props) {
  return (
    <div className="flex items-start justify-between mb-8 print-hidden">
      <div>
        <p className="text-xs text-muted-foreground mb-1">
          <Link href={`/transactions/${transactionId}`} className="hover:underline">
            ← 거래 상세로 돌아가기
          </Link>
        </p>
        <h2 className="text-2xl font-bold">{roundLabel} 정산 리포트</h2>
        {orderNo && <p className="text-sm text-muted-foreground mt-0.5">{orderNo}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" />
          인쇄
        </Button>
        <SettlementPdfButton type="interim" settlementId={interimId} isLocked={interimLocked} />
        <SettlementPdfButton type="closing" settlementId={closingId} isLocked={closingLocked} />
      </div>
    </div>
  )
}
