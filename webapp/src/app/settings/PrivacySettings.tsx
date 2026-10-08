'use client'

import { useState } from 'react'
import posthog from 'posthog-js'
import { Button } from '@/components/ui/Button'
import { statusMessageStyles } from '@/components/ui/FormField'
import { getBrowserCookie, setBrowserCookie } from '@/lib/browserCookies'

const CONSENT_MAX_AGE = 60 * 60 * 24 * 180

export default function PrivacySettings() {
  const [consent, setConsent] = useState<string | null>(() => {
    if (typeof document === 'undefined') return null;
    return getBrowserCookie('cookie_consent');
  })
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = () => {
    setIsSaving(true)
    setMessage('')
    
    if (consent === 'granted') {
      setBrowserCookie('cookie_consent', 'granted', CONSENT_MAX_AGE)
      posthog.opt_in_capturing()
    } else {
      setBrowserCookie('cookie_consent', 'denied', CONSENT_MAX_AGE)
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
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
        {message && (
          <span role="status" className={statusMessageStyles(message)}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
