'use client'

import { UserProfile } from '@clerk/nextjs'
import ThemeSettings from './ThemeSettings'
import PrivacySettings from './PrivacySettings'
import { Palette, Cookie } from 'lucide-react'

export default function UserSettingsClient({
  currentTheme
}: {
  currentTheme: string
}) {
  return (
    <UserProfile routing="hash">
      <UserProfile.Page 
        label="Display Settings" 
        labelIcon={<Palette className="w-4 h-4" />} 
        url="theme-settings"
      >
        <ThemeSettings initialTheme={currentTheme} />
      </UserProfile.Page>
      <UserProfile.Page 
        label="Privacy Settings" 
        labelIcon={<Cookie className="w-4 h-4" />} 
        url="privacy-settings"
      >
        <PrivacySettings />
      </UserProfile.Page>
    </UserProfile>
  )
}
