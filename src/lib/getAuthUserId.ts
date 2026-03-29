import { auth } from '@/auth';

/**
 * Returns the authenticated user's ID from the session, or null if not authenticated.
 * Uses next-auth v5's `auth()` helper which correctly handles all cookie configurations
 * (including secure cookies on HTTPS dev tunnels where NODE_ENV is still 'development').
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.id ?? null;
  } catch (err) {
    console.error('[getAuthUserId] Failed to read session:', err);
    return null;
  }
}
