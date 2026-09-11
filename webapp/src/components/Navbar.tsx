import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';

export default async function Navbar() {
  let user = null;
  try {
    user = await currentUser();
  } catch {
    // Clerk unavailable (e.g., CI environment with dummy keys).
    // Treat as signed-out; the page still renders normally.
  }
  const isSignedIn = !!user;

  return (
    <nav className="w-full flex items-center justify-between py-4 px-8 bg-background border-b border-foreground/10">
      {/* Left: Logo & Text */}
      <div className="flex items-center gap-3 w-1/3">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.svg" loading="eager" alt="ThaiOML Logo" width={32} height={32} className="group-hover:opacity-80 transition" />
          <span className="text-xl font-bold text-foreground group-hover:text-foreground/80 transition">
            ThaiOML
          </span>
        </Link>
      </div>

      {/* Middle: Navigation Links */}
      <div className="flex items-center justify-center gap-4 lg:gap-6 w-1/3 text-base font-medium">
        <Link href="/" className="text-foreground/70 hover:text-foreground transition whitespace-nowrap">
          Search
        </Link>
        <Link href="/chat" className="text-foreground/70 hover:text-foreground transition whitespace-nowrap">
          <span className="hidden xl:inline">Ask the Library</span>
          <span className="xl:hidden">Ask</span>
        </Link>
        <a href="/contribute/" className="text-foreground/70 hover:text-foreground transition whitespace-nowrap">
          Contribute
        </a>
        <a href="/about/" className="text-foreground/70 hover:text-foreground transition whitespace-nowrap">
          About
        </a>
      </div>

      {/* Right: Profile / Auth */}
      <div className="flex items-center justify-end w-1/3">
        {isSignedIn ? (
          <UserButton userProfileMode="navigation" userProfileUrl="/profile" />
        ) : (
          <Link
            href="/sign-in"
            className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
