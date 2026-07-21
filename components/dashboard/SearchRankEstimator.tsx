'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './SearchRankEstimator.module.css'

interface SearchRankEstimatorProps {
  profileId: string
  initialCompleteness: number
  initialPlan: 'free' | 'plus'
  initialViews: number
  category?: string | null
}

const CATEGORY_NAMES: Record<string, string> = {
  service: 'Service Providers',
  professional: 'Professionals',
  creator: 'Creators',
  student: 'Students & Learners',
}

const CATEGORY_POOLS: Record<string, number> = {
  service: 1250,
  professional: 1600,
  creator: 950,
  student: 750,
}

export default function SearchRankEstimator({
  profileId,
  initialCompleteness,
  initialPlan,
  initialViews,
  category = 'service',
}: SearchRankEstimatorProps) {
  const isPlus = initialPlan === 'plus'
  const catKey = category || 'service'
  const categoryName = CATEGORY_NAMES[catKey] || 'Professionals'
  const poolSize = CATEGORY_POOLS[catKey] || 1200

  // Simulation controls
  const [simCompleteness, setSimCompleteness] = useState(initialCompleteness)
  const [simPlus, setSimPlus] = useState(isPlus)

  // Database rank (if RPC exists)
  const [dbRank, setDbRank] = useState<number | null>(null)
  const [dbPlusRank, setDbPlusRank] = useState<number | null>(null)
  const [dbTotal, setDbTotal] = useState<number | null>(null)
  const [rpcSupported, setRpcSupported] = useState(true)

  useEffect(() => {
    async function fetchDbRank() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_profile_rank', {
          p_profile_id: profileId,
        })
        if (error) {
          console.warn('RPC get_profile_rank not available, using client estimator:', error.message)
          setRpcSupported(false)
          return
        }
        if (data) {
          setDbRank(data.actual_rank)
          setDbPlusRank(data.plus_rank)
          setDbTotal(data.total_discoverable)
        }
      } catch (err) {
        console.warn('Failed to call get_profile_rank RPC:', err)
        setRpcSupported(false)
      }
    }
    fetchDbRank()
  }, [profileId, simCompleteness, simPlus]) // refetch if state changes or user saves edits

  // Calculate simulated views boost: log10(1 + views) * 0.5
  const viewsBoost = Math.log10(1.0 + initialViews) * 0.5

  // Score calculations
  const calculateScore = (completeness: number, plusActive: boolean) => {
    const planBoost = plusActive ? 1.5 : 0.0
    const completenessBoost = (completeness / 100.0) * 1.5
    return planBoost + completenessBoost + viewsBoost
  }

  const calculateRank = (score: number, pool: number) => {
    // Rank(score) = max(1, round(pool * 10^(-0.65 * score)))
    return Math.max(1, Math.round(pool * Math.pow(10, -0.65 * score)))
  }

  // Active state ranks
  const activeScore = calculateScore(simCompleteness, simPlus)
  const activeRank = calculateRank(activeScore, poolSize)

  // Comparative states
  const freeMaxScore = calculateScore(100, false)
  const freeMaxRank = calculateRank(freeMaxScore, poolSize)

  const plusMaxScore = calculateScore(100, true)
  const plusMaxRank = calculateRank(plusMaxScore, poolSize)

  // Current database states
  const currentActualRank = dbRank || calculateRank(calculateScore(initialCompleteness, isPlus), poolSize)
  const currentPlusRank = dbPlusRank || calculateRank(calculateScore(initialCompleteness, true), poolSize)
  const totalProfilesCount = dbTotal || poolSize

  // Graph points mapping
  // SVG size: 360 x 120
  // X: Completeness 30% to 100% -> x: 20 to 340
  // Y: Rank 1 to Pool -> Logarithmic mapping: y = 15 + (log10(rank)/log10(pool)) * 90
  const getSvgCoordinates = (completeness: number, plusActive: boolean) => {
    const score = calculateScore(completeness, plusActive)
    const rank = calculateRank(score, poolSize)
    const x = 20 + ((completeness - 30) / 70) * 320
    const y = 15 + (Math.log10(rank) / Math.log10(poolSize)) * 90
    return { x, y, rank }
  }

  // Generate SVG path for Free Curve
  const freePoints = Array.from({ length: 8 }, (_, i) => {
    const comp = 30 + i * 10
    return getSvgCoordinates(comp, false)
  })
  const freePath = `M ${freePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`

  // Generate SVG path for Case+ Curve
  const plusPoints = Array.from({ length: 8 }, (_, i) => {
    const comp = 30 + i * 10
    return getSvgCoordinates(comp, true)
  })
  const plusPath = `M ${plusPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`

  // Current interactive indicator position
  const activeDot = getSvgCoordinates(simCompleteness, simPlus)

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>
            🔍 Search Rank Simulator
            {rpcSupported && dbRank !== null ? (
              <span className={styles.poolBadge}>Live Database Index</span>
            ) : (
              <span className={styles.poolBadge}>Nairobi {categoryName} Pool</span>
            )}
          </h3>
        </div>
        <p className={styles.sub}>
          Case ranks profiles based on <b>Completeness</b>, <b>Engagement</b>, and a <b>Case+ boost</b>. Play with the simulator to see the logarithmic cliff in action.
        </p>
      </div>

      {/* Rank Cards */}
      <div className={styles.rankGrid}>
        {/* Free Plan Rank */}
        <div className={`${styles.rankCard} ${!simPlus ? styles.rankCardActive : ''}`}>
          <span className={styles.rankLabel}>Free Tier Position</span>
          <span className={styles.rankValue}>
            #{simPlus ? calculateRank(calculateScore(simCompleteness, false), poolSize) : activeRank}
          </span>
          <span className={styles.sub} style={{ fontSize: '11px' }}>
            Capped at #{freeMaxRank} (Maxed profile)
          </span>
        </div>

        {/* Case+ Boosted Rank */}
        <div className={`${styles.rankCard} ${simPlus ? styles.rankCardActive : ''}`}>
          <span className={styles.rankLabel}>Case+ Boosted Position</span>
          <span className={`${styles.rankValue} ${styles.rankValueGold}`}>
            #{simPlus ? activeRank : calculateRank(calculateScore(simCompleteness, true), poolSize)}
          </span>
          {simPlus ? (
            <span className={styles.rankChange}>
              {Math.round(calculateRank(calculateScore(simCompleteness, false), poolSize) / activeRank)}x visibility
            </span>
          ) : (
            <span className={styles.rankChange} style={{ background: 'rgba(229,184,105,0.2)', color: '#e5b869' }}>
              Jump to #{calculateRank(calculateScore(simCompleteness, true), poolSize)} instantly
            </span>
          )}
        </div>
      </div>

      {/* Interactive Line Graph */}
      <div className={styles.chartContainer}>
        <svg viewBox="0 0 360 120" className={styles.chartSvg}>
          {/* Grid lines */}
          <line x1="20" y1="15" x2="340" y2="15" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          <line x1="20" y1="60" x2="340" y2="60" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          <line x1="20" y1="105" x2="340" y2="105" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          
          <text x="25" y="25" className={styles.chartLabel}>Top 1% (Rank #10)</text>
          <text x="25" y="70" className={styles.chartLabel}>Top 10% (Rank #100)</text>
          <text x="25" y="112" className={styles.chartLabel}>Top 50% (Rank #500)</text>

          {/* Vertical indicator for current completeness */}
          <line 
            x1={activeDot.x} 
            y1="15" 
            x2={activeDot.x} 
            y2="105" 
            stroke="rgba(255,255,255,0.15)" 
            strokeDasharray="2,2" 
          />

          {/* Curves */}
          {/* Free curve (Gray, dashed, levels off) */}
          <path 
            d={freePath} 
            fill="none" 
            stroke="rgba(138, 145, 130, 0.4)" 
            strokeWidth="2" 
            strokeDasharray="4,4" 
          />
          
          {/* Case+ curve (Gold, glowing, solid) */}
          <path 
            d={plusPath} 
            fill="none" 
            stroke="#e5b869" 
            strokeWidth="3" 
            style={{ filter: 'drop-shadow(0 0 4px rgba(229,184,105,0.4))' }}
          />

          {/* X Axis Labels */}
          <text x="20" y="118" className={styles.chartLabel} textAnchor="start">30% Complete</text>
          <text x="180" y="118" className={styles.chartLabel} textAnchor="middle">65%</text>
          <text x="340" y="118" className={styles.chartLabel} textAnchor="end">100%</text>

          {/* Current Position Glowing Indicator Dot */}
          <circle 
            cx={activeDot.x} 
            cy={activeDot.y} 
            r="6" 
            fill={simPlus ? '#e5b869' : '#8a9182'} 
            stroke="var(--ink)" 
            strokeWidth="2"
            style={{ 
              filter: simPlus 
                ? 'drop-shadow(0 0 6px rgba(229,184,105,0.8))' 
                : 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' 
            }}
          />
        </svg>
      </div>

      {/* Simulator Inputs */}
      <div className={styles.controls}>
        {/* Slider for completeness */}
        <div className={styles.controlGroup}>
          <div className={styles.controlLabelRow}>
            <span>Simulate Profile Completeness</span>
            <span className={styles.controlVal}>{simCompleteness}%</span>
          </div>
          <input 
            type="range" 
            min="30" 
            max="100" 
            value={simCompleteness} 
            onChange={(e) => setSimCompleteness(parseInt(e.target.value))}
            className={styles.slider}
          />
        </div>

        {/* Toggle for Case+ */}
        <div className={styles.toggleRow}>
          <div className={styles.controlGroup}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Case+ Rank Boost</span>
            <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Adds 1.5x multiplier to bypass free-tier cliff</span>
          </div>
          <div className={styles.toggleWrapper}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: simPlus ? '#e5b869' : 'var(--ink-muted)' }}>
              {simPlus ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <label className={styles.switch}>
              <input 
                type="checkbox" 
                checked={simPlus} 
                onChange={(e) => setSimPlus(e.target.checked)}
              />
              <span className={styles.switchSlider}></span>
            </label>
          </div>
        </div>
      </div>

      {/* CTA Box / Subscription info */}
      {!isPlus ? (
        <div className={styles.ctaBanner}>
          <p className={styles.ctaText}>
            <b>You are currently on the Free plan.</b> Your profile's discoverability is hitting the <b>logarithmic cliff</b>. Even at 100% completion, you can't break past the free-tier ranking limit. Upgrading to Case+ pushes you onto the gold curve immediately.
          </p>
          <Link href="/dashboard/billing" style={{ width: '100%' }}>
            <button className={styles.ctaBtn}>
              🚀 Upgrade to Case+ & Unlock Boost
            </button>
          </Link>
        </div>
      ) : (
        <div className={styles.ctaBanner} style={{ background: 'rgba(75, 106, 82, 0.1)', borderColor: 'rgba(75, 106, 82, 0.3)' }}>
          <div className={styles.activeBadge}>✓ Case+ Boost Active</div>
          <p className={styles.ctaText} style={{ marginTop: '4px' }}>
            Your Case+ subscription is active! You are sailing on the gold curve. Add more evidence to push your profile completeness to 100% and claim the top positions in the directory.
          </p>
        </div>
      )}

      {/* Small debug/technical note for transparency */}
      <div className={styles.explainer}>
        {rpcSupported && dbRank !== null ? (
          <span>Live index ranks you among {totalProfilesCount} discoverable candidates in the database.</span>
        ) : (
          <span>Estimated in a regional pool of {poolSize} {categoryName.toLowerCase()}. Actual search placement incorporates keyword matching and engagement metrics.</span>
        )}
      </div>
    </div>
  )
}
