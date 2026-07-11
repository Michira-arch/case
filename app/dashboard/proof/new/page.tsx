'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadEvidence, generateStorageKey } from '@/lib/r2'
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
}

function NewProofPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pillar, setPillar] = useState<Pillar>(
    (searchParams.get('pillar') as Pillar) || 'did'
  )
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [whenLabel, setWhenLabel] = useState('')
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Add to pending uploads
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

  const handleSave = async () => {
    if (!title.trim()) return
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

      // Create the proof item
      const { data: item, error: itemErr } = await supabase
        .from('proof_items')
        .insert({
          profile_id: profile.id,
          pillar,
          title: title.trim(),
          detail: detail.trim() || null,
          when_label: whenLabel.trim() || null,
        })
        .select()
        .single()

      if (itemErr) throw itemErr

      // Upload evidence files
      for (let i = 0; i < uploads.length; i++) {
        const upload = uploads[i]
        if (upload.status === 'done') continue

        try {
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'compressing' } : u
          ))

          const result = await uploadEvidence({
            file: upload.file,
            profileId: profile.id,
            proofItemId: item.id,
            onProgress: (stage, progress) => {
              setUploads(prev => prev.map((u, idx) =>
                idx === i ? { ...u, stage, progress, status: 'uploading' } : u
              ))
            },
          })

          // Record in DB
          await supabase.from('evidence').insert({
            proof_item_id: item.id,
            type: result.type,
            storage_key: result.storageKey,
            bytes_original: result.bytesOriginal,
            bytes_compressed: result.bytesCompressed,
          })

          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'done', storageKey: result.storageKey } : u
          ))
        } catch (uploadErr: any) {
          setUploads(prev => prev.map((u, idx) =>
            idx === i ? { ...u, status: 'error', stage: uploadErr.message } : u
          ))
        }
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const prompts = PILLAR_PROMPTS[pillar]

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
          {(['did', 'trained', 'vouched', 'aiming'] as Pillar[]).map(p => (
            <button
              key={p}
              type="button"
              className={`${styles.pillarBtn} ${pillar === p ? styles.pillarBtnActive : ''}`}
              onClick={() => setPillar(p)}
            >
              <span className={`stamp stamp--${p}`}>{p}</span>
            </button>
          ))}
        </div>

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
