'use client'

import { clearBrowserCookie } from '@/lib/browserCookies'

export default function Footer() {
  const openCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    clearBrowserCookie('cookie_consent');
    window.location.reload();
  };

  return (
    <footer className="w-full py-8 text-center text-sm text-foreground border-t border-foreground/10 bg-background">
      <div className="flex flex-col items-center gap-2 opacity-50">
        <p>© {new Date().getFullYear()} ThaiOML. All rights reserved.</p>
        <button onClick={openCookieSettings} className="hover:text-foreground transition-colors underline">
          Privacy & Cookie Settings
        </button>
      </div>
    </footer>
  )
}
