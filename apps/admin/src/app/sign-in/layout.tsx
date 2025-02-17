import '../globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sign In - SothebAI Admin',
  description: 'Sign in to SothebAI Admin',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 