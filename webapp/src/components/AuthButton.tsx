'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';

export default function AuthButton() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="w-[82px] h-[36px]"></div>; // Placeholder
  }

  return isSignedIn ? (
    <UserButton userProfileMode="navigation" userProfileUrl="/profile" />
  ) : (
    <Link
      href="/sign-in"
      className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 transition"
    >
      Sign In
    </Link>
  );
}
