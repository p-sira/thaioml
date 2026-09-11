'use client'

import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

export function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true)
    } else if (consent === 'granted') {
      posthog.opt_in_capturing()
    }
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'granted')
    posthog.opt_in_capturing()
    setShow(false)
  }

  const decline = () => {
    localStorage.setItem('cookie_consent', 'denied')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 w-full bg-slate-900 text-white p-4 flex justify-between items-center z-50 shadow-lg">
      <p className="text-sm">We use cookies to analyze traffic and improve our services. By clicking &quot;Accept&quot;, you consent to our use of cookies.</p>
      <div className="flex gap-4">
        <button onClick={decline} className="text-sm underline text-slate-300 hover:text-white">Decline</button>
        <button onClick={accept} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium transition-colors">Accept</button>
      </div>
    </div>
  )
}
