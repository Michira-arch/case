import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://case.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/@'],
        disallow: ['/dashboard', '/api/', '/onboarding', '/login', '/signup'],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  }
}
