import Link from 'next/link';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import NavLinks from './NavLinks';

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
    <nav className="w-full flex items-center justify-between py-2 px-8 bg-background border-b border-foreground/10">
      {/* Left: Logo & Text */}
      <div className="flex items-center gap-3 w-1/3">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.svg" loading="eager" alt="ThaiOML Logo" width={64} height={64} className="group-hover:opacity-80 transition" />
        </Link>
      </div>

      {/* Middle: Navigation Links */}
      <NavLinks />

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
