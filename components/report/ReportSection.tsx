import { Separator } from '@/components/ui/separator'

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider whitespace-nowrap">{title}</h3>
        <Separator className="flex-1" />
      </div>
      {children}
    </section>
  )
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm py-0.5">
      <span className="w-36 text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function AmountRow({
  label, value, color, bold,
}: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? 'font-semibold' : 'font-medium'} ${color ?? ''}`}>{value}</span>
    </div>
  )
}
