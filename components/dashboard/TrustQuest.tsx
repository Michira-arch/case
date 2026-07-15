import styles from './TrustQuest.module.css'

interface TrustQuestProps {
  score: number
  plan: 'free' | 'plus'
}

interface Level {
  name: string
  threshold: number
  unlocks: string
}

const LEVELS: Level[] = [
  { name: 'OTP Secured',  threshold: 30,  unlocks: 'Core Dashboard'          },
  { name: 'The Pitch',    threshold: 60,  unlocks: 'Public Profile & SEO'     },
  { name: 'Backed',       threshold: 80,  unlocks: 'Business Card & QR Code'  },
  { name: 'Verified',     threshold: 100, unlocks: 'Case Verified Seal'        },
]

export default function TrustQuest({ score }: TrustQuestProps) {
  // Determine which level is "current" — the first one not yet completed
  const currentIndex = LEVELS.findIndex(l => score < l.threshold)

  return (
    <div className={styles.root}>
      <p className={styles.header}>Trust Quest</p>
      <div className={styles.stepper}>
        {LEVELS.map((level, idx) => {
          const isDone    = score >= level.threshold
          const isCurrent = idx === currentIndex
          const isLocked  = !isDone && !isCurrent

          const bubbleCls = [
            styles.bubble,
            isDone    ? styles.bubbleDone    : '',
            isCurrent ? styles.bubbleCurrent : '',
            isLocked  ? styles.bubbleLocked  : '',
          ].filter(Boolean).join(' ')

          const stepCls = [
            styles.step,
            isDone    ? styles.stepDone    : '',
            isCurrent ? styles.stepCurrent : '',
          ].filter(Boolean).join(' ')

          const nameCls = [
            styles.stepName,
            isDone    ? styles.stepNameDone    : '',
            isCurrent ? styles.stepNameCurrent : '',
            isLocked  ? styles.stepNameLocked  : '',
          ].filter(Boolean).join(' ')

          return (
            <div key={level.name} className={stepCls}>
              <div className={bubbleCls} aria-label={`Level ${idx + 1}: ${level.name}`}>
                {isDone ? '✓' : isLocked ? '🔒' : idx + 1}
              </div>
              <div className={styles.stepLabel}>
                <span className={nameCls}>{level.name}</span>
                <span className={styles.stepUnlocks}>{level.unlocks}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
