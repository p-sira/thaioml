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
    const dbAccent = user.publicMetadata?.accent as string | undefined

    if (dbTheme || dbAccent) {
      const localTheme = getCookie('thaioml-theme')
      const localAccent = getCookie('thaioml-accent-color')

      let updated = false
      if (dbTheme && dbTheme !== localTheme) {
        setCookie('thaioml-theme', dbTheme)
        updated = true
      }
      if (dbAccent && dbAccent !== localAccent) {
        setCookie('thaioml-accent-color', dbAccent)
        updated = true
      }

      if (updated) {
        applyThemeVariables(dbTheme || localTheme || 'leuko', dbAccent || localAccent || '#64748b')
      }
    }
  }, [user, isLoaded])

  // 2. Synchronous-like application on mount and listen to changes
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const applyCurrent = () => {
      const theme = getCookie('thaioml-theme') || 'leuko'
      const accent = getCookie('thaioml-accent-color') || '#64748b'
      applyThemeVariables(theme, accent)
    }

    applyCurrent()

    window.addEventListener('theme-change', applyCurrent)
    return () => window.removeEventListener('theme-change', applyCurrent)
  }, [])

  return <>{children}</>
}

function applyThemeVariables(theme: string, hex: string) {
  // We apply CSS variables that align with Mkdocs Material for consistency across apps
  document.body.setAttribute('data-md-color-scheme', theme)
  
  if (hex) {
    document.documentElement.style.setProperty('--md-accent-fg-color', hex)
    let r = 0, g = 0, b = 0
    if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16)
      g = parseInt(hex.substring(3, 5), 16)
      b = parseInt(hex.substring(5, 7), 16)
    }
    document.documentElement.style.setProperty(
      '--md-accent-fg-color--transparent', 
      `rgba(${r}, ${g}, ${b}, 0.1)`
    )
  }
}
