'use client'

import { useState } from 'react'
import posthog from 'posthog-js'

function getConsentCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )cookie_consent=([^;]+)'))
  if (match) return match[2]
  return null
}

function setConsentCookie(value: string) {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const domainStr = isLocal ? '' : `; domain=.${window.location.hostname.replace(/^[^.]+\./g, '')}`
  document.cookie = `cookie_consent=${value}; path=/; max-age=15552000${domainStr}`
}

export default function PrivacySettings() {
  const [consent, setConsent] = useState<string | null>(() => {
    if (typeof document === 'undefined') return null;
    return getConsentCookie();
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = () => {
    setIsSaving(true)
    setMessage('')
    
    if (consent === 'granted') {
      setConsentCookie('granted')
      posthog.opt_in_capturing()
    } else {
      setConsentCookie('denied')
      posthog.opt_out_capturing()
    }
    
    setTimeout(() => {
      setMessage('Privacy preferences updated successfully.')
      setIsSaving(false)
    }, 300)
  }

  return (
    <div className="p-6 max-w-xl transition-colors duration-300">
      <h2 className="text-xl font-bold text-foreground mb-6 transition-colors duration-300">Privacy Settings</h2>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3 transition-colors duration-300">Analytics & Tracking</h3>
        <p className="text-sm text-foreground/70 mb-4">
          We use PostHog to analyze traffic and improve our services. You can opt-in or out of analytics tracking at any time.
        </p>
        
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="analytics" 
              value="granted" 
              checked={consent === 'granted'} 
              onChange={() => setConsent('granted')}
              className="accent-blue-600"
            />
            <span className="text-sm text-foreground">Opt-in</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="analytics" 
              value="denied" 
              checked={consent !== 'granted'} 
              onChange={() => setConsent('denied')}
              className="accent-blue-600"
            />
            <span className="text-sm text-foreground">Opt-out</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-foreground text-background font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-all duration-300"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
        {message && (
          <span className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
