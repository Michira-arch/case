import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getNannyOrgBySlug, getServiceTypes } from '@/lib/nanny-data'
import type { NannyServiceType } from '@/lib/nanny-types'

interface Props {
  params: { handle: string }
}

export async function generateMetadata({ params }: Props) {
  const org = await getNannyOrgBySlug(params.handle)
  if (!org) return { title: 'Not found' }
  return {
    title: org.seo_title ?? `${org.name} — Caregiving Agency`,
    description: org.seo_description ?? org.description ?? org.tagline ?? '',
    openGraph: {
      title: org.name,
      description: org.tagline ?? '',
      images: org.cover_url ? [{ url: org.cover_url }] : [],
    },
  }
}

const SERVICE_ICONS: Record<string, string> = {
  elderly:   '🩺',
  patient:   '🏥',
  dementia:  '🧠',
  companion: '🤝',
  caregiving:'❤️',
  nanny:     '👶',
  maternity: '🤱',
  live_in:   '🏠',
  cleaning:  '🧹',
  deep_clean:'✨',
  default:   '🌿',
}

function getIcon(code: string) {
  for (const [k, v] of Object.entries(SERVICE_ICONS)) {
    if (code.includes(k)) return v
  }
  return SERVICE_ICONS.default
}

function formatRate(svc: NannyServiceType) {
  if (!svc.base_rate) return 'Quoted'
  const unit = svc.pricing_model === 'hourly' ? '/hr' : ''
  return `KES ${svc.base_rate.toLocaleString()}${unit}`
}

function PricingBadge({ model }: { model: NannyServiceType['pricing_model'] }) {
  const map = {
    hourly:    { label: 'Hourly', color: 'var(--verified)', bg: 'var(--verified-bg)' },
    flat_rate: { label: 'Flat Rate', color: 'var(--brass)', bg: 'var(--brass-bg)' },
    quoted:    { label: 'Get Quote', color: 'var(--aim)', bg: 'var(--aim-bg)' },
  }
  const { label, color, bg } = map[model] ?? map.quoted
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 999,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  )
}

export default async function AgencyLandingPage({ params }: Props) {
  const org = await getNannyOrgBySlug(params.handle)
  if (!org) notFound()

  const services = await getServiceTypes(org.id)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Hero ── */}
      <div
        style={{
          background: org.cover_url
            ? `linear-gradient(to bottom, rgba(32,40,31,0.55), rgba(32,40,31,0.8)), url(${org.cover_url}) center/cover no-repeat`
            : 'var(--ink)',
          color: 'var(--paper)',
          padding: '72px 24px 60px',
          textAlign: 'center',
        }}
      >
        {org.logo_url && (
          <img
            src={org.logo_url}
            alt={`${org.name} logo`}
            style={{
              width: 80,
              height: 80,
              borderRadius: 'var(--radius-lg)',
              margin: '0 auto 20px',
              objectFit: 'contain',
              background: 'rgba(255,255,255,0.1)',
              padding: 8,
            }}
          />
        )}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {org.name}
        </h1>
        {org.tagline && (
          <p
            style={{
              fontSize: 18,
              color: 'rgba(241,237,226,0.8)',
              maxWidth: 520,
              margin: '0 auto 32px',
              lineHeight: 1.5,
            }}
          >
            {org.tagline}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href={`/agency/${params.handle}/nanny/book`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--brass)',
              color: '#2A1D0C',
              padding: '14px 32px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
              transition: 'background 150ms ease',
            }}
          >
            Book Now →
          </Link>
          {org.contact_phone && (
            <a
              href={`tel:${org.contact_phone}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.12)',
                color: 'var(--paper)',
                padding: '14px 24px',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              📞 {org.contact_phone}
            </a>
          )}
        </div>
      </div>

      {/* ── About ── */}
      {org.description && (
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '56px 24px 0',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 16.5,
              lineHeight: 1.7,
              color: 'var(--ink-soft)',
            }}
          >
            {org.description}
          </p>
        </div>
      )}

      {/* ── Services ── */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '56px 24px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Our Services
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'var(--ink-muted)',
            textAlign: 'center',
            marginBottom: 36,
          }}
        >
          Professional care tailored to your family's needs.
        </p>

        {services.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
            Services coming soon.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {services.map((svc) => (
              <div
                key={svc.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  transition: 'box-shadow 200ms ease',
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 12,
                    lineHeight: 1,
                  }}
                >
                  {getIcon(svc.code)}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 17,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {svc.name}
                  </h3>
                  <PricingBadge model={svc.pricing_model} />
                </div>
                {svc.description && (
                  <p
                    style={{
                      fontSize: 13.5,
                      color: 'var(--ink-muted)',
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    {svc.description}
                  </p>
                )}
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--brass)',
                  }}
                >
                  {formatRate(svc)}
                  {svc.min_hours && (
                    <span
                      style={{
                        fontWeight: 400,
                        color: 'var(--ink-muted)',
                      }}
                    >
                      {' '}
                      · min {svc.min_hours}h
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            marginTop: 48,
            background: 'var(--ink)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 32px',
            textAlign: 'center',
            color: 'var(--paper)',
          }}
        >
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 24,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Ready to book?
          </h3>
          <p
            style={{
              color: 'rgba(241,237,226,0.7)',
              marginBottom: 24,
              fontSize: 15,
            }}
          >
            No account required. Book in under 2 minutes.
          </p>
          <Link
            href={`/agency/${params.handle}/nanny/book`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--brass)',
              color: '#2A1D0C',
              padding: '14px 32px',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Book Now →
          </Link>
        </div>
      </div>

      {/* ── Contact / footer ── */}
      {(org.contact_email || org.contact_phone || org.address) && (
        <div
          style={{
            borderTop: '1px solid var(--line)',
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              justifyContent: 'center',
              fontSize: 14,
              color: 'var(--ink-soft)',
            }}
          >
            {org.contact_email && (
              <a
                href={`mailto:${org.contact_email}`}
                style={{ color: 'var(--brass)', textDecoration: 'none' }}
              >
                ✉ {org.contact_email}
              </a>
            )}
            {org.contact_phone && (
              <a
                href={`tel:${org.contact_phone}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                📞 {org.contact_phone}
              </a>
            )}
            {org.address && <span>📍 {org.address}</span>}
          </div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--ink-muted)',
              marginTop: 24,
            }}
          >
            Powered by{' '}
            <a
              href="/"
              style={{ color: 'var(--brass)', textDecoration: 'none' }}
            >
              Case
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
