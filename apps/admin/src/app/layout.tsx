import './globals.css'
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const inter = Inter({ subsets: ['latin'] })
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 10000, // Refetch every 10 seconds
      staleTime: 5000, // Consider data stale after 5 seconds
      retry: 3,
    },
  },
})

export const metadata: Metadata = {
  title: 'SothebAI Admin',
  description: 'Admin dashboard for SothebAI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <html lang="en" suppressHydrationWarning>
          <body className={cn(
            "min-h-screen bg-background font-sans antialiased",
            inter.className
          )}>
            {children}
          </body>
        </html>
      </QueryClientProvider>
    </ClerkProvider>
  )
} 