import Link from 'next/link';
import Image from 'next/image';
import NavLinks from './NavLinks';
import AuthButton from './AuthButton';

export default function Navbar() {
  return (
    <div role="navigation" className="w-full flex items-center justify-between py-2 px-8 bg-background border-b border-foreground/10">
      {/* Left: Logo & Text */}
      <div className="flex items-center gap-3 w-1/3">
        <Link href="/" className="flex items-center gap-3 group no-underline">
          <Image src="/logo.svg" loading="eager" alt="ThaiOML Logo" width={64} height={64} className="theme-logo-invert group-hover:opacity-80 transition" />
        </Link>
      </div>

      {/* Middle: Navigation Links */}
      <NavLinks />

      {/* Right: Profile / Auth */}
      <div className="flex items-center justify-end w-1/3">
        <AuthButton />
      </div>
    </div>
  );
}
