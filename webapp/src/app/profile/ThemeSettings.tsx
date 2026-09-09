'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateThemeSettings } from '../actions/theme'

const ACCENTS = [
  { name: 'Slate (Default)', hex: '#64748b' },
  { name: 'Medical Blue', hex: '#0284c7' },
  { name: 'Cyan', hex: '#0891b2' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Crimson', hex: '#e11d48' },
  { name: 'Rose', hex: '#be123c' },
  { name: 'Amber', hex: '#d97706' }
]

const THEMES = [
  { id: 'leuko', name: 'Leuko' },
  { id: 'darkroom', name: 'Darkroom' },
  { id: 'progressnote', name: 'Progressnote' },
]

// Note: Using document.cookie for cross-subdomain sharing (e.g. thaioml.org and app.thaioml.org)
function setCookie(name: string, value: string, days: number = 365) {
  const d = new Date()
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000))
  // We use Domain=.thaioml.org in production or just standard cookie path=/ for local dev
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const domainString = isLocal ? '' : `domain=.${window.location.hostname.replace(/^[^.]+\./g, '')};`
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;${domainString}SameSite=Lax`
}

export default function ThemeSettings({
  initialTheme = 'leuko',
  initialAccent = '#64748b'
}: {
  initialTheme?: string,
  initialAccent?: string
}) {
  const [theme, setTheme] = useState(initialTheme)
  const [accent, setAccent] = useState(initialAccent)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      // 1. Save to cookies synchronously
      setCookie('thaioml-theme', theme)
      setCookie('thaioml-accent-color', accent)

      // 2. Dispatch custom event for ThemeProvider to pick up instantly without reload
      window.dispatchEvent(new Event('theme-change'))

      // 3. Save to Clerk metadata asynchronously
      await updateThemeSettings(theme, accent)

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
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-bold text-foreground mb-6">Display Settings</h2>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">Theme</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`p-3 border rounded-lg text-sm font-medium transition ${theme === t.id
                ? 'border-blue-600 bg-blue-600/10 text-blue-600'
                : 'border-foreground/20 hover:border-foreground/30 text-foreground/80'
                }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground/80 mb-3">Accent Color</h3>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.hex}
              onClick={() => setAccent(a.hex)}
              title={a.name}
              className={`w-10 h-10 rounded-full border-2 transition-all ${accent.toLowerCase() === a.hex.toLowerCase()
                ? 'border-foreground scale-110 shadow-sm'
                : 'border-transparent hover:scale-105'
                }`}
              style={{ backgroundColor: a.hex }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-foreground text-background font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
        {message && (
          <span className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
