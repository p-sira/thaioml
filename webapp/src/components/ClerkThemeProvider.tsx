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
      const match = document.cookie.match('(^|;) ?thaioml-theme=([^;]*)(;|$)')
      const currentTheme = match ? match[2] : 'leuko'
      setTheme(currentTheme)
    }

    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  return (
    <ClerkProvider
      appearance={{
        baseTheme: theme === 'darkroom' ? dark : undefined,
      }}
    >
      {children}
    </ClerkProvider>
  )
}
