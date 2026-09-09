'use client'

import { UserProfile } from '@clerk/nextjs'
import ThemeSettings from './ThemeSettings'
import { Palette } from 'lucide-react'

export default function UserProfileClient({
  currentTheme,
  currentAccent
}: {
  currentTheme: string
  currentAccent: string
}) {
  return (
    <UserProfile routing="hash">
      <UserProfile.Page 
        label="Display Settings" 
        labelIcon={<Palette className="w-4 h-4" />} 
        url="theme-settings"
      >
        <ThemeSettings initialTheme={currentTheme} initialAccent={currentAccent} />
      </UserProfile.Page>
    </UserProfile>
  )
}
