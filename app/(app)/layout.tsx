import { Sidebar } from '@/components/nav/sidebar'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen print:min-h-0">
      <Sidebar />
      <main className="flex-1 overflow-auto print:overflow-visible">
        <div className="container max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
