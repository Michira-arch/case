'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadEvidence, generateStorageKey } from '@/lib/r2'
import { GUIDE_PROOF_ITEMS } from '@/lib/guide-examples'
import styles from './new.module.css'

type Pillar = 'did' | 'trained' | 'vouched' | 'aiming'

const PILLAR_PROMPTS: Record<Pillar, { placeholder: string; detailPlaceholder: string }> = {
  did: {
    placeholder: 'What did you do? e.g. "Rewired a 3-bedroom home\'s electrical"',
    detailPlaceholder: 'Client, dates, what it involved. The more specific, the more credible.',
  },
  trained: {
    placeholder: 'What training or course? e.g. "2-year apprenticeship under Wanjiru Kamau"',
    detailPlaceholder: 'Where, when, what you learned.',
  },
  vouched: {
    placeholder: 'Add a quote from a client or colleague',
    detailPlaceholder: 'Who they are and their relationship to you.',
  },
  aiming: {
    placeholder: 'What are you looking for? e.g. "Open to a 3-month trial for a sales role"',
    detailPlaceholder: 'Location preferences, availability, conditions.',
  },
}

interface UploadState {
  file: File
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error'
  progress: number
  stage: string
  storageKey?: string
  type?: 'img' | 'pdf' | 'vid'
  previewUrl?: string
  bytesOriginal?: number
  bytesCompressed?: number
}

function NewProofPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [itemId] = useState(() => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID()
    }
    return 'item-' + Math.random().toString(36).substring(2, 12)
  })

  const [pillar, setPillar] = useState<Pillar>(
    (searchParams.get('pillar') as Pillar) || 'did'
  )
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [whenLabel, setWhenLabel] = useState('')
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cameraModal, setCameraModal] = useState<{ type: 'img' | 'vid'; active: boolean }>({ type: 'img', active: false })

  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('You must be signed in to upload files.')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!profile) {
      alert('Profile not found.')
      return
    }

    const startIndex = uploads.length

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

    newUploads.forEach((upload, idx) => {
      const globalIndex = startIndex + idx
      const performUpload = async () => {
        try {
          setUploads(prev => prev.map((u, i) =>
            i === globalIndex ? { ...u, status: 'compressing', stage: 'Compressing…' } : u
          ))

          const result = await uploadEvidence({
            file: upload.file,
            profileId: profile.id,
            proofItemId: itemId,
            onProgress: (stage, progress) => {
              setUploads(prev => prev.map((u, i) =>
                i === globalIndex ? { ...u, stage, progress, status: 'uploading' } : u
              ))
            },
          })

          setUploads(prev => prev.map((u, i) =>
            i === globalIndex ? {
              ...u,
              status: 'done',
              stage: 'Done',
              storageKey: result.storageKey,
              type: result.type,
              bytesOriginal: result.bytesOriginal,
              bytesCompressed: result.bytesCompressed
            } : u
          ))

          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(30)
          }
        } catch (err: any) {
          setUploads(prev => prev.map((u, i) =>
            i === globalIndex ? { ...u, status: 'error', stage: err.message || 'Upload failed' } : u
          ))
        }
      }
      performUpload()
    })
  }

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!title.trim()) return

    const hasActiveUploads = uploads.some(u => u.status === 'pending' || u.status === 'compressing' || u.status === 'uploading')
    if (hasActiveUploads) {
      alert('Please wait for files to finish uploading.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!profile) throw new Error('Profile not found')

      const { data: item, error: itemErr } = await supabase
        .from('proof_items')
        .insert({
          id: itemId,
          profile_id: profile.id,
          pillar,
          title: title.trim(),
          detail: detail.trim() || null,
          when_label: whenLabel.trim() || null,
        })
        .select()
        .single()

      if (itemErr) throw itemErr

      for (const u of uploads) {
        if (u.status !== 'done' || !u.storageKey) continue

        await supabase.from('evidence').insert({
          proof_item_id: item.id,
          type: u.type,
          storage_key: u.storageKey,
          bytes_original: u.bytesOriginal || u.file.size,
          bytes_compressed: u.bytesCompressed || u.file.size,
        })
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60])
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating your profile.')
      setSaving(false)
    }
  }

  const prompts = PILLAR_PROMPTS[pillar]
  const guideItem = GUIDE_PROOF_ITEMS.find(item => item.pillar === pillar)

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>← Back</button>
          <h1 className={styles.title}>Add a piece of proof</h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Pillar picker */}
        <div className={styles.pillarPicker}>
          {(['did', 'trained', 'vouched', 'aiming'] as Pillar[]).map(p => {
            const labels: Record<string, string> = {
              did: 'did',
              trained: 'trained',
              vouched: 'recommendation',
              aiming: 'aiming',
            }
            return (
              <button
                key={p}
                type="button"
                className={`${styles.pillarBtn} ${pillar === p ? styles.pillarBtnActive : ''}`}
                onClick={() => setPillar(p)}
              >
                <span className={`stamp stamp--${p}`}>{labels[p]}</span>
              </button>
            )
          })}
        </div>

        {/* Guided template blueprint hint */}
        {guideItem && (
          <div className={styles.guideBlueprintCard}>
            <div className={styles.guideBlueprintHeader}>
              <span className={styles.guideBlueprintLabel}>💡 Template Blueprint (Alex Rivera — Spatial Flow Coordinator)</span>
              <button 
                type="button" 
                className={styles.useTemplateBtn}
                onClick={() => {
                  setTitle(guideItem.title)
                  setDetail(guideItem.detail || '')
                  setWhenLabel(guideItem.when_label || '')
                }}
              >
                Use blueprint
              </button>
            </div>
            <p className={styles.guideBlueprintTitle}>"{guideItem.title}"</p>
            {guideItem.detail && <p className={styles.guideBlueprintDetail}>{guideItem.detail}</p>}
            {guideItem.when_label && (
              <span className={styles.guideBlueprintWhen}>Recommended Date: {guideItem.when_label}</span>
            )}
          </div>
        )}

        {/* Form */}
        <div className="field">
          <label className="label">Title *</label>
          <input
            type="text"
            className="input"
            placeholder={prompts.placeholder}
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label className="label">Detail <span style={{ color: 'var(--ink-muted)' }}>(optional)</span></label>
          <textarea
            className={`input textarea`}
            placeholder={prompts.detailPlaceholder}
            value={detail}
            onChange={e => setDetail(e.target.value)}
            rows={3}
          />
        </div>

        {(pillar === 'did' || pillar === 'trained') && (
          <div className="field">
            <label className="label">Time period <span style={{ color: 'var(--ink-muted)' }}>(optional)</span></label>
            <input
              type="text"
              className="input"
              placeholder="e.g. 2020–2022 · Jan 2024 · Last month"
              value={whenLabel}
              onChange={e => setWhenLabel(e.target.value)}
            />
          </div>
        )}

        {/* Evidence upload */}
        <div className={styles.evidenceSection}>
          <p className={styles.evidenceLabel}>
            Attach evidence — anything that backs this up.
          </p>
          <p className={styles.evidenceHint}>
            Nobody checks it for you; you decide what to show. Photos get auto-compressed before upload.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,video/mp4,video/webm"
            multiple
            className={styles.fileInput}
            onChange={handleFileSelect}
          />

          <div className={styles.attachBtns}>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => {
                setCameraModal({ type: 'img', active: true })
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
                  fileInputRef.current.removeAttribute('capture')
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
                setCameraModal({ type: 'vid', active: true })
              }}
            >
              🎥 Video
            </button>
          </div>

          {/* Upload list */}
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

        {/* Save */}
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
            {saving ? 'Saving…' : 'Save to case'}
          </button>
        </div>
      </div>
      {cameraModal.active && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 40, 31, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setCameraModal(prev => ({ ...prev, active: false }))}
        >
          <div
            style={{
              background: 'var(--card)',
              width: '100%',
              maxWidth: '480px',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              padding: '24px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)', textAlign: 'center' }}>
              Add {cameraModal.type === 'img' ? 'Photo' : 'Video'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn--brass btn--full"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = cameraModal.type === 'img' ? 'image/*' : 'video/*'
                    fileInputRef.current.setAttribute('capture', 'environment')
                    fileInputRef.current.click()
                  }
                  setCameraModal(prev => ({ ...prev, active: false }))
                }}
              >
                📷 Take a Photo
              </button>

              <button
                type="button"
                className="btn btn--outline btn--full"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = cameraModal.type === 'img' ? 'image/*' : 'video/*'
                    fileInputRef.current.removeAttribute('capture')
                    fileInputRef.current.click()
                  }
                  setCameraModal(prev => ({ ...prev, active: false }))
                }}
              >
                📁 Choose from Gallery / Files
              </button>

              <button
                type="button"
                className="btn btn--full"
                style={{ background: 'none', border: 'none', color: 'var(--ink-muted)', marginTop: '6px', cursor: 'pointer' }}
                onClick={() => setCameraModal(prev => ({ ...prev, active: false }))}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { Suspense } from 'react'

export default function NewProofPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: '100px auto' }} />}>
      <NewProofPageContent />
    </Suspense>
  )
}
