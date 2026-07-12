'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadEvidence, getMediaUrl } from '@/lib/r2'
import type { ProofItem, Evidence } from '@/lib/types'
import styles from './edit.module.css'

type Pillar = 'did' | 'trained' | 'vouched' | 'aiming'

interface UploadState {
  file: File
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error'
  progress: number
  stage: string
  storageKey?: string
  type?: 'img' | 'pdf' | 'vid'
  previewUrl?: string
}

export default function EditProofPage() {
  const router = useRouter()
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [item, setItem] = useState<ProofItem | null>(null)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [whenLabel, setWhenLabel] = useState('')
  const [visible, setVisible] = useState(true)
  const [existingEvidence, setExistingEvidence] = useState<Evidence[]>([])
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [previewingEv, setPreviewingEv] = useState<Evidence | null>(null)

  const supabase = createClient()
  const itemId = params.id as string

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch proof item and verify ownership via profile ownership join
        const { data: proofItem, error: fetchErr } = await supabase
          .from('proof_items')
          .select('*, profiles(owner_id)')
          .eq('id', itemId)
          .single()

        if (fetchErr || !proofItem) {
          throw new Error('Proof item not found or access denied')
        }

        // Verify owner_id matches user
        if ((proofItem as any).profiles?.owner_id !== user.id) {
          throw new Error('Unauthorized')
        }

        // Fetch evidence
        const { data: evList } = await supabase
          .from('evidence')
          .select('*')
          .eq('proof_item_id', itemId)
          .order('created_at')

        setItem(proofItem)
        setTitle(proofItem.title)
        setDetail(proofItem.detail || '')
        setWhenLabel(proofItem.when_label || '')
        setVisible(proofItem.visible)
        setExistingEvidence(evList || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (itemId) fetchItem()
  }, [itemId])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const newUploads: UploadState[] = files.map(f => {
      const type = f.type.startsWith('image/') ? 'img' : f.type === 'application/pdf' ? 'pdf' : 'vid'
      const previewUrl = f.type.startsWith('image/') || f.type.startsWith('video/')
        ? URL.createObjectURL(f)
        : undefined

      return {
        file: f,
        status: 'pending',
        progress: 0,
        stage: 'Waiting…',
        type,
        previewUrl,
      }
    })

    setUploads(prev => [...prev, ...newUploads])
  }

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteEvidence = async (evId: string) => {
    if (!confirm('Are you sure you want to delete this evidence?')) return
    try {
      const { error: delErr } = await supabase
        .from('evidence')
        .delete()
        .eq('id', evId)

      if (delErr) throw delErr

      setExistingEvidence(prev => prev.filter(e => e.id !== evId))
    } catch (err: any) {
      alert(`Failed to delete evidence: ${err.message}`)
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !item) return
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      // Update proof item
      const { error: updateErr } = await supabase
        .from('proof_items')
        .update({
          title: title.trim(),
          detail: detail.trim() || null,
          when_label: whenLabel.trim() || null,
          visible,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)

      if (updateErr) throw updateErr

      // Process pending uploads
      for (let i = 0; i < uploads.length; i++) {
        const upload = uploads[i]
        if (upload.status === 'done') continue

        try {
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'compressing' } : u
          ))

          const result = await uploadEvidence({
            file: upload.file,
            profileId: item.profile_id,
            proofItemId: item.id,
            onProgress: (stage, progress) => {
              setUploads(prev => prev.map((u, idx) =>
                idx === i ? { ...u, stage, progress, status: 'uploading' } : u
              ))
            },
          })

          // Save to database
          const { data: newEv, error: evInsertErr } = await supabase
            .from('evidence')
            .insert({
              proof_item_id: item.id,
              type: result.type,
              storage_key: result.storageKey,
              bytes_original: result.bytesOriginal,
              bytes_compressed: result.bytesCompressed,
            })
            .select()
            .single()

          if (evInsertErr) throw evInsertErr

          setExistingEvidence(prev => [...prev, newEv])
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'done', storageKey: result.storageKey } : u
          ))
        } catch (uploadErr: any) {
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'error', stage: uploadErr.message } : u
          ))
        }
      }

      setSuccess(true)
      // Clear completed uploads
      setUploads([])
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.error}>Proof item not found.</div>
          <button onClick={() => router.push('/dashboard')} className="btn btn--outline">
            Go to dashboard
          </button>
        </div>
      </div>
    )
  }

  const isAimingOrVouched = item.pillar === 'aiming' || item.pillar === 'vouched'

  const PILLAR_LABELS: Record<string, string> = {
    did: 'did',
    trained: 'trained',
    vouched: 'recommendation',
    aiming: 'aiming',
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>← Back</button>
          <h1 className={styles.title}>Edit proof</h1>
          <div style={{ marginTop: 8 }}>
            <span className={`stamp stamp--${item.pillar}`}>{PILLAR_LABELS[item.pillar] || item.pillar}</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>✓ Changes saved successfully!</div>}

        <div className="field">
          <label className="label">Title *</label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label className="label">Detail <span style={{ color: 'var(--ink-muted)' }}>(optional)</span></label>
          <textarea
            className="input textarea"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            rows={4}
          />
        </div>

        {!isAimingOrVouched && (
          <div className="field">
            <label className="label">Time period <span style={{ color: 'var(--ink-muted)' }}>(optional)</span></label>
            <input
              type="text"
              className="input"
              value={whenLabel}
              onChange={e => setWhenLabel(e.target.value)}
              placeholder="e.g. 2020–2022 · Jan 2024"
            />
          </div>
        )}

        <div className="field">
          <label className="label">Visibility</label>
          <div className={styles.visibilityToggle}>
            <button
              type="button"
              className={`${styles.visibilityBtn} ${visible ? styles.visibilityBtnActive : ''}`}
              onClick={() => setVisible(true)}
            >
              Public
            </button>
            <button
              type="button"
              className={`${styles.visibilityBtn} ${!visible ? styles.visibilityBtnActive : ''}`}
              onClick={() => setVisible(false)}
            >
              Hidden
            </button>
          </div>
          <p className={styles.hint}>
            Hidden items are only visible to you in the dashboard.
          </p>
        </div>

        {/* Existing Evidence */}
        <div className={styles.evidenceSection}>
          <h3 className={styles.sectionHeading}>Existing evidence</h3>
          {existingEvidence.length === 0 ? (
            <p className={styles.noEvidence}>No evidence files attached yet.</p>
          ) : (
            <div className={styles.evidenceGrid}>
              {existingEvidence.map(ev => (
                <div key={ev.id} className={styles.evidenceCard}>
                  <div
                    className={`${styles.evidenceThumb} ${styles.evidenceThumbInteractive}`}
                    onClick={() => setPreviewingEv(ev)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setPreviewingEv(ev) }}
                  >
                    {ev.type === 'img' ? (
                      <img src={getMediaUrl(ev.storage_key)} alt="" className={styles.thumbImg} />
                    ) : (
                      <div className={styles.thumbIcon}>
                        {ev.type === 'pdf' ? '📄 PDF' : '🎥 VID'}
                      </div>
                    )}
                  </div>
                  <div className={styles.evidenceDetails}>
                    <span className={styles.evidenceType}>{ev.type.toUpperCase()}</span>
                    {ev.bytes_compressed && (
                      <span className={styles.evidenceSize}>
                        {(ev.bytes_compressed / 1024).toFixed(0)}KB
                      </span>
                    )}
                    <button
                      type="button"
                      className={styles.deleteEvidenceBtn}
                      onClick={() => handleDeleteEvidence(ev.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Evidence */}
        <div className={styles.newEvidenceSection}>
          <h3 className={styles.sectionHeading}>Add new evidence</h3>
          <p className={styles.hint} style={{ marginBottom: 12 }}>
            Attach photos, PDFs, or videos to back up your claims.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,video/mp4,video/webm"
            multiple
            capture="environment"
            className={styles.fileInput}
            onChange={handleFileSelect}
          />

          <div className={styles.attachBtns}>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*'
                  fileInputRef.current.click()
                }
              }}
            >
              📷 Photo
            </button>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'application/pdf'
                  fileInputRef.current.click()
                }
              }}
            >
              📄 Document
            </button>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'video/*'
                  fileInputRef.current.click()
                }
              }}
            >
              🎥 Video
            </button>
          </div>

          {/* New uploads list */}
          {uploads.length > 0 && (
            <div className={styles.uploadList}>
              {uploads.map((u, i) => (
                <div key={i} className={styles.uploadItem}>
                  <div className={styles.uploadInfo}>
                    {u.previewUrl ? (
                      u.type === 'img' ? (
                        <img src={u.previewUrl} alt="" className={styles.thumbnailPreview} />
                      ) : (
                        <video src={u.previewUrl} className={styles.thumbnailPreview} muted />
                      )
                    ) : (
                      <div className={styles.thumbnailPreviewFallback}>
                        {u.type === 'pdf' ? '📄' : '📁'}
                      </div>
                    )}
                    <div className={styles.uploadTextDetails}>
                      <span className={styles.uploadName}>{u.file.name}</span>
                      <span className={styles.uploadSize}>
                        {(u.file.size / 1024).toFixed(0)}KB
                      </span>
                    </div>
                  </div>
                  <div className={styles.uploadStatus}>
                    {u.status === 'done' && <span className={styles.statusDone}>✓ Uploaded</span>}
                    {u.status === 'error' && <span className={styles.statusError}>✗ {u.stage}</span>}
                    {(u.status === 'compressing' || u.status === 'uploading' || u.status === 'pending') && (
                      <span className={styles.statusProgress}>
                        {u.stage} {u.status === 'uploading' ? `${u.progress}%` : ''}
                      </span>
                    )}
                    {u.status !== 'done' && (
                      <button onClick={() => removeUpload(i)} className={styles.removeBtn}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.saveRow}>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--brass"
            disabled={saving || !title.trim()}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {previewingEv && (
        <EvidencePreviewModal
          evidence={previewingEv}
          onClose={() => setPreviewingEv(null)}
        />
      )}
    </div>
  )
}

function EvidencePreviewModal({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const mediaUrl = getMediaUrl(evidence.storage_key)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close preview">
          ✕
        </button>
        
        <div className={styles.modalBody}>
          {evidence.type === 'img' && (
            <img src={mediaUrl} alt={evidence.caption || 'Evidence'} className={styles.modalImg} />
          )}
          {evidence.type === 'vid' && (
            <video src={mediaUrl} controls autoPlay className={styles.modalVideo} />
          )}
          {evidence.type === 'pdf' && (
            <div className={styles.pdfViewer}>
              <iframe src={mediaUrl} className={styles.pdfIframe} title="PDF Preview" />
              <div className={styles.pdfFallback}>
                <p style={{ marginBottom: 12 }}>Previewing Document</p>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--brass"
                  style={{ display: 'inline-flex', padding: '8px 16px', fontSize: 13 }}
                >
                  Open PDF in new tab
                </a>
              </div>
            </div>
          )}
        </div>
        
        {evidence.caption && (
          <div className={styles.modalCaption}>{evidence.caption}</div>
        )}
      </div>
    </div>
  )
}
