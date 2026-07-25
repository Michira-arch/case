'use client'

import React, { useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  title: string
  body: string
  type?: 'success' | 'indigo' | 'amber' | 'info'
  icon?: string
}

interface SignalToastProps {
  toasts: ToastMessage[]
  onDismiss?: (id: string) => void
}

export default function SignalToast({ toasts, onDismiss }: SignalToastProps) {
  if (!toasts || toasts.length === 0) return null

  const getBorderColor = (type?: string) => {
    switch (type) {
      case 'success': return 'rgba(16,185,129,0.5)'
      case 'indigo': return 'rgba(99,102,241,0.5)'
      case 'amber': return 'rgba(245,158,11,0.5)'
      default: return 'rgba(59,130,246,0.5)'
    }
  }

  const getGlow = (type?: string) => {
    switch (type) {
      case 'success': return '0 8px 24px rgba(16,185,129,0.25)'
      case 'indigo': return '0 8px 24px rgba(99,102,241,0.25)'
      case 'amber': return '0 8px 24px rgba(245,158,11,0.25)'
      default: return '0 8px 24px rgba(59,130,246,0.25)'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            backgroundColor: '#111116',
            color: '#f9fafb',
            padding: '16px 20px',
            borderRadius: '14px',
            border: `1px solid ${getBorderColor(toast.type)}`,
            boxShadow: getGlow(toast.type),
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>
            {toast.icon || (toast.type === 'success' ? '✨' : toast.type === 'amber' ? '⚡' : '🔒')}
          </div>

          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 700, color: '#f9fafb' }}>
              {toast.title}
            </h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.4 }}>
              {toast.body}
            </p>
          </div>

          {onDismiss && (
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '0 0 0 8px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
