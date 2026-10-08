'use client'

import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import { getBrowserCookie, setBrowserCookie } from '@/lib/browserCookies'

const CONSENT_MAX_AGE = 60 * 60 * 24 * 180

export function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = getBrowserCookie('cookie_consent')
    if (!consent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true)
    } else if (consent === 'granted') {
      posthog.opt_in_capturing()
    }
  }, [])

  const accept = () => {
    setBrowserCookie('cookie_consent', 'granted', CONSENT_MAX_AGE)
    posthog.opt_in_capturing()
    posthog.capture('$pageview')
    setShow(false)
  }

  const decline = () => {
    setBrowserCookie('cookie_consent', 'denied', CONSENT_MAX_AGE)
    setShow(false)
  }

  if (!show) return null

  return (
    <aside aria-label="Cookie consent" className="fixed bottom-0 w-full bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-lg">
      <p className="text-sm">We use cookies to analyze traffic and improve our services. By clicking &quot;Accept&quot;, you consent to our use of cookies.</p>
      <div className="flex gap-4">
        <button onClick={decline} className="text-sm underline text-slate-300 hover:text-white">Decline</button>
        <button onClick={accept} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors">Accept</button>
      </div>
    </aside>
  )
}
