'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getVisitorCountryCode, calculatePPPPricedPlan } from '@/lib/ppp-pricing'
import styles from './PricingCard.module.css'

interface PricingCardProps {
  name: string
  isFree: boolean
  features: string[]
  cta: string
  href: string
  highlight: boolean
}

export default function PricingCard({
  name,
  isFree,
  features,
  cta,
  href,
  highlight,
}: PricingCardProps) {
  const [pricingInfo, setPricingInfo] = useState({
    price6m: 'KES 70',
    price12m: 'KES 100',
  })

  useEffect(() => {
    const country = getVisitorCountryCode()
    const ppp6m = calculatePPPPricedPlan('6m', country)
    const ppp12m = calculatePPPPricedPlan('12m', country)
    setPricingInfo({
      price6m: ppp6m.formattedLocal,
      price12m: ppp12m.formattedLocal,
    })
  }, [])

  return (
    <div className={`${styles.pricingCard} ${highlight ? styles.pricingCardHighlight : ''}`}>
      <div className={styles.pricingCardHead}>
        <h3 className={styles.pricingName}>{name}</h3>
        <div className={styles.pricingPrice}>
          {isFree ? (
            <span className={styles.pricingAmount}>Free</span>
          ) : (
            <div className={styles.priceRow}>
              <div className={styles.amountLine}>
                <span className={styles.pricingAmount}>{pricingInfo.price12m}</span>
                <span className={styles.pricingPeriod}>/ 12 months</span>
              </div>
              <div className={styles.subAmountLine}>
                or {pricingInfo.price6m} / 6 months
              </div>
            </div>
          )}
        </div>
      </div>
      <ul className={styles.pricingFeatures}>
        {features.map((f) => (
          <li key={f} className={styles.pricingFeature}>
            <span className={styles.pricingCheck}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link href={href} className={`btn btn--full ${highlight ? 'btn--brass' : 'btn--outline'}`}>
        {cta}
      </Link>
    </div>
  )
}
