import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getNannyOrgBySlug, getServiceTypes, getPublicWorkers } from '@/lib/nanny-data'
import type { NannyServiceType, NannyWorker } from '@/lib/nanny-types'
import RequestToJoinButton from './RequestToJoinButton'

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
      description: org.tagline ?? org.description ?? '',
      url: `https://caseshow.info/agency/${params.handle}/nanny`,
      siteName: 'Case',
      images: org.cover_url ? [
        {
          url: org.cover_url,
          width: 1200,
          height: 630,
          alt: `${org.name} Cover Image`,
        }
      ] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: org.name,
      description: org.tagline ?? org.description ?? '',
      images: org.cover_url ? [org.cover_url] : [],
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
  const unit = svc.pricing_model === 'hourly' ? '/hr' : ` / ${svc.duration_unit}`
  return `KES ${svc.base_rate.toLocaleString()}${unit}`
}

function PricingBadge({ model }: { model: NannyServiceType['pricing_model'] }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    hourly:    { label: 'Hourly', color: 'var(--verified)', bg: 'var(--verified-bg)' },
    per_day:   { label: 'Per Day', color: 'var(--verified)', bg: 'var(--verified-bg)' },
    per_week:  { label: 'Per Week', color: 'var(--verified)', bg: 'var(--verified-bg)' },
    per_month: { label: 'Per Month', color: 'var(--verified)', bg: 'var(--verified-bg)' },
    per_shift: { label: 'Per Shift', color: 'var(--verified)', bg: 'var(--verified-bg)' },
    per_task:  { label: 'Per Task', color: 'var(--verified)', bg: 'var(--verified-bg)' },
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
  const workers = await getPublicWorkers(org.id)
  
  const pageConfig = org.page_config as any
  if (pageConfig?.is_custom_page && pageConfig?.custom_html) {
    return (
      <div 
        style={{ width: '100%', minHeight: '100vh' }}
        dangerouslySetInnerHTML={{ __html: pageConfig.custom_html }}
      />
    )
  }

  const { page_config: config } = org

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper)',
        fontFamily: 'var(--font-sans)',
        ...(config.hero_pattern === 'dots'
          ? { backgroundImage: 'radial-gradient(var(--line) 1px, transparent 0)', backgroundSize: '24px 24px' }
          : config.hero_pattern === 'grid'
          ? { backgroundImage: 'linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)', backgroundSize: '40px 40px' }
          : {}),
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
          {config.hero_headline || org.name}
        </h1>
        {(config.hero_subtitle || org.tagline) && (
          <p
            style={{
              fontSize: 18,
              color: 'rgba(241,237,226,0.8)',
              maxWidth: 520,
              margin: '0 auto 32px',
              lineHeight: 1.5,
            }}
          >
            {config.hero_subtitle || org.tagline}
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
            {config.cta_text || 'Book Now'} →
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
          {org.paystack_subaccount_code && (
            <Link
              href={`/agency/${params.handle}/pay`}
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
              }}
            >
              💳 Pay Agency
            </Link>
          )}
        </div>
      </div>

      {/* ── About / Pitch ── */}
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '72px 24px 0',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 20,
          }}
        >
          {config.pitch_title}
        </h2>
        {(config.pitch_body || org.description) && (
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: 'var(--ink-soft)',
              marginBottom: 32,
            }}
          >
            {config.pitch_body || org.description}
          </p>
        )}
      </div>

      {/* ── Services ── */}
      {config.show_services && (
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
      </div>
      )}

      {/* ── Workers ── */}
      {config.show_workers && workers.length > 0 && (
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
            Meet Our Professionals
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--ink-muted)',
              textAlign: 'center',
              marginBottom: 36,
            }}
          >
            Highly vetted, experienced, and ready to assist you.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {workers.map((worker) => (
              <div
                key={worker.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {worker.profile?.avatar_url ? (
                  <img
                    src={worker.profile.avatar_url}
                    alt={worker.profile.display_name}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--paper-light)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'var(--ink)',
                      color: 'var(--paper)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      fontWeight: 600,
                      border: '3px solid var(--paper-light)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    {worker.profile?.display_name.charAt(0)}
                  </div>
                )}

                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      marginBottom: 4,
                    }}
                  >
                    {worker.profile?.display_name}
                  </h3>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--brass-bg)',
                      color: 'var(--brass)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ★ {worker.avg_rating ? worker.avg_rating.toFixed(1) : 'New'}
                  </div>
                </div>

                {worker.notes && (
                  <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                    "{worker.notes}"
                  </p>
                )}

                <Link
                  href={`/agency/${params.handle}/nanny/book?worker_id=${worker.id}`}
                  style={{
                    marginTop: 'auto',
                    width: '100%',
                    display: 'inline-flex',
                    justifyContent: 'center',
                    background: 'var(--paper-light)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  Book {worker.profile?.display_name.split(' ')[0]}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 56px' }}>
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
            {config.cta_text || 'Ready to book?'}
          </h3>
          <p
            style={{
              color: 'rgba(241,237,226,0.7)',
              marginBottom: 24,
              fontSize: 15,
            }}
          >
            {config.cta_subtext || 'No account required. Book in under 2 minutes.'}
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
              transition: 'background 150ms ease',
            }}
          >
            {config.cta_text || 'Book Now'} →
          </Link>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Are you a caregiver?</h4>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginTop: 4 }}>
            Join our agency to get matched with families and manage your bookings.
          </p>
          <RequestToJoinButton orgId={org.id} />
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
