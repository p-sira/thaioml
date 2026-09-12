'use client'

export default function Footer() {
  const openCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    const domainStr = window.location.hostname.includes('thaioml.org') ? '; domain=.thaioml.org' : '';
    document.cookie = `cookie_consent=; path=/; max-age=0${domainStr}`;
    window.location.reload();
  };

  return (
    <div role="contentinfo" className="w-full py-8 text-center text-sm text-foreground border-t border-foreground/10 bg-background">
      <div className="flex flex-col items-center gap-2 opacity-50">
        <p>© {new Date().getFullYear()} ThaiOML. All rights reserved.</p>
        <button onClick={openCookieSettings} className="hover:text-foreground transition-colors underline">
          Privacy & Cookie Settings
        </button>
      </div>
    </div>
  )
}
