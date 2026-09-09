'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'

function setCookie(name: string, value: string, days: number = 365) {
  const d = new Date()
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000))
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const domainString = isLocal ? '' : `domain=.${window.location.hostname.replace(/^[^.]+\./g, '')};`
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;${domainString}SameSite=Lax`
}

function getCookie(name: string) {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const initialized = useRef(false)

  // 1. Reconcile Clerk metadata with Cookies when user data loads
  useEffect(() => {
    if (!isLoaded || !user) return

    const dbTheme = user.publicMetadata?.theme as string | undefined

    if (dbTheme) {
      const localTheme = getCookie('thaioml-theme')

      let updated = false
      if (dbTheme && dbTheme !== localTheme) {
        setCookie('thaioml-theme', dbTheme)
        updated = true
      }

      if (updated) {
        applyThemeVariables(dbTheme || localTheme || 'leuko')
      }
    }
  }, [user, isLoaded])

  // 2. Synchronous-like application on mount and listen to changes
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const applyCurrent = () => {
      let theme = getCookie('thaioml-theme');
      if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'darkroom' : 'leuko';
      }
      applyThemeVariables(theme)
    }

    applyCurrent()

    window.addEventListener('theme-change', applyCurrent)
    return () => window.removeEventListener('theme-change', applyCurrent)
  }, [])

  return <>{children}</>
}

function applyThemeVariables(theme: string) {
  // We apply CSS variables that align with Mkdocs Material for consistency across apps
  document.body.setAttribute('data-md-color-scheme', theme)
}
