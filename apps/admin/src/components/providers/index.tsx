'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { QueryProvider } from './query-provider'
import { useState, useEffect, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // You can return a loading skeleton here if needed
    return null
  }

  return (
    <ClerkProvider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </ClerkProvider>
  )
} 