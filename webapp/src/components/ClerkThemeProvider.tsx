'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { useEffect, useState } from 'react'

export function ClerkThemeProvider({
  children,
  initialTheme
}: {
  children: React.ReactNode
  initialTheme: string
}) {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    const handleThemeChange = () => {
      const bodyTheme = document.body.getAttribute('data-md-color-scheme')
      const match = document.cookie.match('(^|;) ?thaioml-theme=([^;]*)(;|$)')
      const currentTheme = bodyTheme || (match ? match[2] : 'leuko')
      setTheme(currentTheme)
    }

    window.addEventListener('theme-change', handleThemeChange)
    handleThemeChange() // Initialize immediately on mount
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === 'darkroom' ? dark : undefined,
        variables: {
          colorBackground: 'var(--md-default-bg-color)',
          colorForeground: 'var(--md-default-fg-color)',
          colorMutedForeground: 'var(--md-default-fg-color--light)',
          colorInput: 'var(--md-code-bg-color)',
          colorInputForeground: 'var(--md-default-fg-color)',
          colorPrimary: 'var(--md-accent-fg-color)',
          colorNeutral: 'var(--md-default-fg-color)',
        },
        elements: {
          userButtonPopoverActionButton: {
            color: 'var(--md-default-fg-color)',
          },
          userButtonPopoverActionButtonIconBox: {
            color: 'var(--md-default-fg-color)',
          }
        }
      }}
      localization={{
        userButton: {
          action__manageAccount: "Settings",
        }
      }}
    >
      {children}
    </ClerkProvider>
  )
}
