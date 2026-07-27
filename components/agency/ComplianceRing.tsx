'use client'

import React from 'react'
import styles from '@/app/dashboard/agency/nanny/nanny-dashboard.module.css'

interface ComplianceRingProps {
  /** Number of OK credentials */
  ok: number
  /** Total required credentials */
  total: number
  /** Diameter of the SVG ring in px */
  size?: number
  /** Stroke width in px */
  strokeWidth?: number
  /** Show numeric label inside ring */
  showLabel?: boolean
}

/**
 * A circular SVG progress ring that visualises worker credential compliance.
 * Uses the design system colours: verified-green when ≥ 100 %, brass when
 * partially compliant, danger-red when below 50 %.
 */
export default function ComplianceRing({
  ok,
  total,
  size = 56,
  strokeWidth = 5,
  showLabel = true,
}: ComplianceRingProps) {
  if (total === 0) {
    return (
      <div className={styles.complianceRingWrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            fill="none"
            stroke="var(--line)"
            strokeWidth={strokeWidth}
          />
        </svg>
        {showLabel && (
          <span className={styles.complianceRingLabel}>N/A</span>
        )}
      </div>
    )
  }

  const pct = Math.min(ok / total, 1)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  const color =
    pct >= 1
      ? 'var(--verified)'
      : pct >= 0.5
      ? 'var(--brass)'
      : 'var(--danger)'

  const trackColor =
    pct >= 1
      ? 'var(--verified-bg)'
      : pct >= 0.5
      ? 'var(--brass-bg)'
      : 'var(--danger-bg)'

  return (
    <div className={styles.complianceRingWrap}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>

      {showLabel && (
        <span className={styles.complianceRingLabel}>
          {ok}/{total}
        </span>
      )}
    </div>
  )
}
