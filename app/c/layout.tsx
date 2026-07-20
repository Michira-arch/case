import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connected Card — Case',
  description: 'View contacts and verified credentials via Case.',
}

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
