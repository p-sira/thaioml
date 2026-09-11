'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

function getConsentCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )cookie_consent=([^;]+)'))
  if (match) return match[2]
  return null
}

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  const consent = getConsentCookie()
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    opt_out_capturing_by_default: consent !== 'granted',
  })
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>
}
