import { NextResponse } from 'next/server';

/**
 * GET /api/auth/logout
 * Redirects the user to NextAuth's built-in signOut endpoint, which clears the session cookie.
 */
export async function GET(): Promise<Response> {
  return NextResponse.redirect(
    new URL('/api/auth/signout', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  );
}
