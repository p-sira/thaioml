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

/**
 * Inner component that calls useUser() — must only be rendered inside <ClerkProvider>.
 * Reconciles the user's Clerk publicMetadata theme with the local cookie.
 */
function ClerkThemeSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

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

  return <>{children}</>
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isClerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false'
  const initialized = useRef(false)

  // Apply theme from cookie / system preference on mount and listen for changes.
  // This runs regardless of Clerk state.
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

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (!getCookie('thaioml-theme')) {
        applyCurrent();
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    window.addEventListener('theme-change', applyCurrent)
    return () => {
      window.removeEventListener('theme-change', applyCurrent)
      mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [])

  // When Clerk is enabled, wrap children in ClerkThemeSync to reconcile
  // publicMetadata theme with the local cookie. When disabled (e.g., CI),
  // skip it entirely — useUser() must not be called outside ClerkProvider.
  if (isClerkEnabled) {
    return <ClerkThemeSync>{children}</ClerkThemeSync>
  }
  return <>{children}</>
}

function applyThemeVariables(theme: string) {
  // We apply CSS variables that align with Mkdocs Material for consistency across apps
  document.body.setAttribute('data-md-color-scheme', theme)
}
