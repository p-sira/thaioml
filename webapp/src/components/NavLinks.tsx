'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks() {
  const pathname = usePathname();

  // Helper to determine if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      // the search page is effectively the home of the Next.js app
      return pathname === '/' || pathname?.startsWith('/search');
    }
    return pathname?.startsWith(path);
  };

  const getLinkClass = (path: string) => {
    const base = 'text-sm transition-opacity';
    const active = isActive(path) 
      ? 'text-foreground font-bold !underline underline-offset-4' 
      : 'text-foreground opacity-70 hover:opacity-100 font-normal no-underline';
    return `${base} ${active}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 lg:gap-6 w-1/3">
      <Link href="/search/?q=" className={getLinkClass('/')}>
        Search
      </Link>
      <Link href="/chat" className={getLinkClass('/chat')}>
        <span className="hidden xl:inline">Ask the Library</span>
        <span className="xl:hidden">Ask</span>
      </Link>
      <a href="/contribute/" className={getLinkClass('/contribute')}>
        Contribute
      </a>
      <a href="/about/" className={getLinkClass('/about')}>
        About
      </a>
    </div>
  );
}
