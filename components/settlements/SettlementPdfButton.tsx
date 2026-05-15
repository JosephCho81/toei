'use client'

import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SettlementPdfButtonProps {
  type: 'interim' | 'closing'
  settlementId: string | null
  isLocked: boolean
  label?: string
  className?: string
}

export function SettlementPdfButton({ type, settlementId, isLocked, label, className }: SettlementPdfButtonProps) {
  function handleClick() {
    if (!settlementId) return
    window.open(`/api/pdf/${type}?settlementId=${settlementId}`, '_blank')
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={!isLocked || !settlementId}
      title={!isLocked ? '정산 확정 후 출력 가능' : 'PDF 출력'}
      className={className}
    >
      <FileText className="h-4 w-4 mr-1" />
      {label ?? 'PDF 출력'}
    </Button>
  )
}
