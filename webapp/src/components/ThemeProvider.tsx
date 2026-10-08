'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useRef } from 'react'
import { getBrowserCookie, setBrowserCookie } from '@/lib/browserCookies'
import { isTheme, type Theme } from '@/lib/theme'

const THEME_MAX_AGE = 60 * 60 * 24 * 365

/**
 * Inner component that calls useUser() — must only be rendered inside <ClerkProvider>.
 * Reconciles the user's Clerk publicMetadata theme with the local cookie.
 */
function ClerkThemeSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded || !user) return

    const dbTheme = user.publicMetadata?.theme

    if (isTheme(dbTheme)) {
      const localTheme = getBrowserCookie('thaioml-theme')

      if (dbTheme !== localTheme) {
        setBrowserCookie('thaioml-theme', dbTheme, THEME_MAX_AGE)
        applyThemeVariables(dbTheme)
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
      const savedTheme = getBrowserCookie('thaioml-theme');
      const theme: Theme = isTheme(savedTheme)
        ? savedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'darkroom' : 'leuko';
      applyThemeVariables(theme)
    }

    applyCurrent()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (!isTheme(getBrowserCookie('thaioml-theme'))) {
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

function applyThemeVariables(theme: Theme) {
  // We apply CSS variables that align with Mkdocs Material for consistency across apps
  document.body.setAttribute('data-md-color-scheme', theme)
}
