import type { Metadata } from 'next'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/ui/sidebar'

export const metadata: Metadata = {
  title: 'SothebAI Admin',
  description: 'Admin dashboard for SothebAI',
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen p-6">
        {children}
      </div>
    </div>
  )
} 