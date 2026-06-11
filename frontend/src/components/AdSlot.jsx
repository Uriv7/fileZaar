/**
 * AdSlot.jsx — Google AdSense ad unit component
 *
 * Usage:
 *   <AdSlot slot="1234567890" format="auto" />
 *   <AdSlot slot="1234567890" format="rectangle" />
 *
 * To activate ads after AdSense approval:
 *   1. Replace YOUR_PUBLISHER_ID below with your ca-pub-XXXXXXXXXXXXXXXX
 *   2. Replace slot prop values in Home.jsx and ConvertPage.jsx with your ad unit IDs
 *   3. Uncomment the script tag in index.html
 */

import { useEffect, useRef } from 'react'

const PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX'  // ← Replace with your Publisher ID

export function AdSlot({ slot, format = 'auto', style = {} }) {
  const adRef = useRef(null)
  const pushed = useRef(false)

  useEffect(() => {
    // Don't push twice (React StrictMode double-invokes effects in dev)
    if (pushed.current) return
    pushed.current = true

    try {
      // Only run if AdSense script is loaded
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (e) {
      // AdSense not loaded yet or blocked — silent fail
    }
  }, [])

  // Don't render anything if publisher ID not configured
  if (PUBLISHER_ID === 'ca-pub-XXXXXXXXXXXXXXXX') return null

  return (
    <div
      className="fz-ad-slot"
      style={{
        textAlign: 'center',
        margin: '2rem auto',
        maxWidth: '900px',
        overflow: 'hidden',
        ...style,
      }}
      aria-label="Advertisement"
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
