'use client';

import Link from 'next/link';
import { UserButton, useAuth, useUser } from '@clerk/nextjs';
import { User } from 'lucide-react';
import { buttonStyles } from './ui/Button';

const HAS_CLERK = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false';

function SignInLink() {
  return <Link href="/sign-in" className={buttonStyles()}>Sign In</Link>;
}

function InnerAuthButton() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return <div className="w-[82px] h-[36px]"></div>; // Placeholder
  }

  const profileUrl = user?.username ? `/user/${user.username}` : `/user/${user?.id}`;

  return isSignedIn ? (
    <UserButton
      userProfileMode="navigation"
      userProfileUrl="/settings"
      appearance={{
        elements: {
          userButtonPopoverCustomItem: { color: 'inherit' },
          userButtonPopoverCustomItemButton: { color: 'inherit' },
          userButtonPopoverCustomItemButtonText: { color: 'inherit' },
          userButtonPopoverCustomItemButtonIcon: { color: 'inherit' },
        },
      }}
    >
      <UserButton.MenuItems>
        <UserButton.Link
          label="Profile"
          labelIcon={<User className="w-4 h-4" />}
          href={profileUrl}
        />
        <UserButton.Action label="manageAccount" />
      </UserButton.MenuItems>
    </UserButton>
  ) : <SignInLink />;
}

export default function AuthButton() {
  if (!HAS_CLERK) return <SignInLink />;
  
  return <InnerAuthButton />;
}
