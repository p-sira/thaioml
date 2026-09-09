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
  const [themeVariables, setThemeVariables] = useState<any>({})

  useEffect(() => {
    const handleThemeChange = () => {
      const bodyTheme = document.body.getAttribute('data-md-color-scheme')
      const match = document.cookie.match('(^|;) ?thaioml-theme=([^;]*)(;|$)')
      const currentTheme = bodyTheme || (match ? match[2] : 'leuko')
      setTheme(currentTheme)
      
      // Delay slightly to ensure ThemeProvider has updated the body attribute
      setTimeout(() => {
        const styles = getComputedStyle(document.body)
        setThemeVariables({
          colorBackground: styles.getPropertyValue('--md-default-bg-color').trim() || undefined,
          colorForeground: styles.getPropertyValue('--md-default-fg-color').trim() || undefined,
          colorMutedForeground: styles.getPropertyValue('--md-default-fg-color--light').trim() || undefined,
          colorInput: styles.getPropertyValue('--md-code-bg-color').trim() || undefined,
          colorInputForeground: styles.getPropertyValue('--md-default-fg-color').trim() || undefined,
          colorPrimary: styles.getPropertyValue('--md-accent-fg-color').trim() || undefined,
        })
      }, 50)
    }

    window.addEventListener('theme-change', handleThemeChange)
    handleThemeChange() // Initialize immediately on mount
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === 'darkroom' ? dark : undefined,
        variables: themeVariables
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
