import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isClerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false';

export default isClerkEnabled
  ? clerkMiddleware()
  : async (_req: NextRequest) => NextResponse.next();

export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
  ],
};
