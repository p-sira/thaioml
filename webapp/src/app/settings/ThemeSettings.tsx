'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateThemeSettings } from '../actions/theme'
import { Button } from '@/components/ui/Button'
import { statusMessageStyles } from '@/components/ui/FormField'
import { getBrowserCookie, setBrowserCookie } from '@/lib/browserCookies'
import { isTheme, THEMES, type Theme } from '@/lib/theme'

const THEME_MAX_AGE = 60 * 60 * 24 * 365

export default function ThemeSettings({
  initialTheme = 'leuko'
}: {
  initialTheme?: string
}) {
  const [theme, setTheme] = useState<Theme>(isTheme(initialTheme) ? initialTheme : 'leuko')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  // Apply theme for preview when selected
  useEffect(() => {
    document.body.setAttribute('data-md-color-scheme', theme)
    window.dispatchEvent(new Event('theme-change'))

    // Cleanup function to revert to initial theme if component unmounts without saving
    // Note: The handleSave function dispatches 'theme-change' which re-reads the cookie,
    // but if we just navigate away, we want to revert to the saved state.
    return () => {
      // We read the cookie to revert to the saved state, or fallback to initialTheme
      const savedTheme = getBrowserCookie('thaioml-theme')
      const themeToRevertTo = isTheme(savedTheme) ? savedTheme : (isTheme(initialTheme) ? initialTheme : 'leuko')
      document.body.setAttribute('data-md-color-scheme', themeToRevertTo)
      window.dispatchEvent(new Event('theme-change'))
    }
  }, [theme, initialTheme])


  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      // 1. Save to cookies synchronously
      setBrowserCookie('thaioml-theme', theme, THEME_MAX_AGE)

      // 2. Dispatch custom event for ThemeProvider to pick up instantly without reload
      window.dispatchEvent(new Event('theme-change'))

      // 3. Save to Clerk metadata asynchronously
      await updateThemeSettings(theme)

      router.refresh()
      setMessage('Preferences saved successfully.')
    } catch (error) {
      setMessage('Failed to save preferences.')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-xl transition-colors duration-300">
      <h2 className="text-xl font-bold text-foreground mb-6 transition-colors duration-300">Display Settings</h2>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3 transition-colors duration-300">Theme</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-3 border rounded-lg text-sm font-medium transition-all duration-300 ${theme === t.id
                ? 'border-blue-600 bg-blue-600/10 text-blue-600'
                : 'border-foreground/20 hover:border-foreground/30 text-foreground/80'
                }`}
            >
              {t.name}
            </button>
          ))}
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
