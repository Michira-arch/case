import { notFound } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import styles from './qr.module.css'

interface Props {
  params: any
}

export default async function QrPage({ params }: Props) {
  const p = await params
  const handle = (p?.handle || '').startsWith('%40')
    ? decodeURIComponent(p.handle).slice(1)
    : (p?.handle || '')

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, role_line, handle')
    .eq('handle', handle)
    .eq('is_public', true)
    .maybeSingle()

  if (!profile) {
    notFound()
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://case.app'
  const profileUrl = `${appUrl}/@${profile.handle}`

  // Generate QR code as DataURL (server-side)
  let qrDataUrl = ''
  try {
    qrDataUrl = await QRCode.toDataURL(profileUrl, {
      margin: 1,
      width: 400,
      color: {
        dark: '#20281F',  // Ink
        light: '#FAF8F3', // Paper-light
      },
    })
  } catch (err) {
    console.error('Failed to generate QR code', err)
  }

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Link href="/dashboard" className="btn btn--outline btn--sm">
          ← Dashboard
        </Link>
        <button onClick={() => window.print()} className="btn btn--brass btn--sm">
          Print badge
        </button>
      </div>

      <div className={styles.printArea}>
        {/* Front side of the card / standee */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.wordmark}>Case</span>
            <span className={styles.badge}>SCAN MY CASE</span>
          </div>

          <div className={styles.qrContainer}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code to Case profile" className={styles.qrImage} />
            ) : (
              <div className={styles.qrFallback}>QR Code</div>
            )}
          </div>

          <div className={styles.cardFooter}>
            <h2 className={styles.name}>{profile.display_name}</h2>
            {profile.role_line && <p className={styles.role}>{profile.role_line}</p>}
            <p className={styles.url}>case.app/@{profile.handle}</p>
          </div>
        </div>

        <p className={styles.printNote}>
          💡 <b>Tip:</b> Print this page and cut out the card to place on your shop counter, desk, or business cards.
        </p>
      </div>
    </div>
  )
}
