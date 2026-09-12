'use client';

import Link from 'next/link';
import { UserButton, useAuth } from '@clerk/nextjs';

const HAS_CLERK = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false';

function InnerAuthButton() {
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

export default function AuthButton() {
  if (!HAS_CLERK) {
    return (
      <Link
        href="/sign-in"
        className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:bg-foreground/90 transition"
      >
        Sign In
      </Link>
    );
  }
  
  return <InnerAuthButton />;
}
