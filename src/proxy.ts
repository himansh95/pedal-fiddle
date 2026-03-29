import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_API_PATHS = [
  '/api/auth',     // NextAuth internal routes
  '/api/webhooks', // Strava webhook (validated internally by verify token)
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
  if (isPublicApi) return NextResponse.next();

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/api/');
  if (!isProtected) return NextResponse.next();

  const session = await auth();

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
