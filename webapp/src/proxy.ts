import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isClerkEnabled = process.env.NEXT_PUBLIC_CLERK_ENABLED !== 'false';

// The custom handler that proxies MkDocs static assets manually using fetch
// This avoids Next.js's rewrite() engine crashing on Python WSGI's Connection: close bug
const handleProxy = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const siteUrl = process.env.DOCS_UPSTREAM_URL || 'http://localhost:8000';

  if (
    pathname.startsWith('/assets/') ||
    /\.(css|js|png|jpg|jpeg|gif|svg|json|xml|gz|woff|woff2|ico|webmanifest)$/i.test(pathname)
  ) {
    const url = `${siteUrl}${pathname}${req.nextUrl.search}`;
    try {
      const res = await fetch(url);
      const headers = new Headers(res.headers);
      
      // Node.js strips encoding from the fetch response body, so we must remove encoding headers
      // otherwise the browser thinks the body is still compressed.
      headers.delete('content-encoding');
      headers.delete('transfer-encoding');
      headers.delete('connection');
      
      // MkDocs assets have content hashes in their filenames, so they can be aggressively cached
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      return new NextResponse(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    } catch (e) {
      console.error('Failed to proxy asset:', e);
      return new NextResponse('Asset Proxy Error', { status: 500 });
    }
  }

  return NextResponse.next();
};

export default isClerkEnabled
  ? clerkMiddleware(async (auth, req) => {
      return await handleProxy(req);
    })
  : async (req: NextRequest) => await handleProxy(req);

export const config = {
  matcher: [
    // We want to run this middleware on ALL requests except Next.js internal static assets (_next/static, _next/image)
    // so that it can intercept MkDocs assets and also authenticate API routes/pages.
    '/((?!_next/static|_next/image).*)',
  ],
};
