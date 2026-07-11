import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Case — prove you\'ve got it',
    template: '%s | Case',
  },
  description: 'A proof-of-work profile — show what you\'ve done, how you learned it, who\'ll vouch for you, and what you\'re aiming for next. Built for Nairobi and beyond.',
  keywords: ['portfolio', 'proof of work', 'Kenya', 'freelancer', 'skills', 'testimonials', 'case'],
  authors: [{ name: 'Case' }],
  creator: 'Case',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://case.app'),
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: '/',
    siteName: 'Case',
    title: 'Case — prove you\'ve got it',
    description: 'Your proof-of-work profile. Not just a CV.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case — prove you\'ve got it',
    description: 'Your proof-of-work profile. Not just a CV.',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Case',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#20281F',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        {children}
        {/* Paystack inline JS — loaded on billing page only */}
      </body>
    </html>
  )
}
