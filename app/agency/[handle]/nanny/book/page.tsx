import { notFound } from 'next/navigation'
import { getNannyOrgBySlug, getServiceTypes } from '@/lib/nanny-data'
import BookingWizard from './BookingWizard'

interface Props {
  params: { handle: string }
}

export async function generateMetadata({ params }: Props) {
  const org = await getNannyOrgBySlug(params.handle)
  if (!org) return { title: 'Book' }
  return {
    title: `Book — ${org.name}`,
    description: `Book a service with ${org.name}`,
  }
}

export default async function BookingPage({ params }: Props) {
  const org = await getNannyOrgBySlug(params.handle)
  if (!org) notFound()

  const services = await getServiceTypes(org.id)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        paddingTop: 32,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          maxWidth: 580,
          margin: '0 auto',
          padding: '0 24px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <a
          href={`/agency/${params.handle}/nanny`}
          style={{
            fontSize: 13,
            color: 'var(--ink-muted)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Back to {org.name}
        </a>
      </div>

      <BookingWizard
        services={services}
        orgSlug={params.handle}
        orgName={org.name}
      />
    </div>
  )
}
