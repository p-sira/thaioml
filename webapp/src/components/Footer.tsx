'use client'

export default function Footer() {
  const openCookieSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    const domainStr = window.location.hostname.includes('thaioml.org') ? '; domain=.thaioml.org' : '';
    document.cookie = `cookie_consent=; path=/; max-age=0${domainStr}`;
    window.location.reload();
  };

  return (
    <footer className="w-full py-8 text-center text-sm text-foreground/50 border-t border-foreground/10 bg-background">
      <div className="flex flex-col items-center gap-2">
        <p>© {new Date().getFullYear()} ThaiOML. All rights reserved.</p>
        <button onClick={openCookieSettings} className="hover:text-foreground transition-colors underline">
          Privacy & Cookie Settings
        </button>
      </div>
    </footer>
  )
}
