'use client'

import AppShell from '@/components/app-shell'

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

export default function Home() {
  return <AppShell />
}
