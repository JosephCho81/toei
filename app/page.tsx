import { redirect } from 'next/navigation'

// Root redirect — actual content is in app/(app)/page.tsx
export default function RootPage() {
  redirect('/transactions')
}
