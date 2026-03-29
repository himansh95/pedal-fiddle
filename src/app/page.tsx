'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect already-authenticated users straight to the dashboard
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  // Show spinner only while redirecting an authenticated user
  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm p-10 shadow-2xl shadow-black/50">
        {/* Logo / wordmark */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="text-4xl">🚴</span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Pedal Fiddle
          </h1>
          <p className="text-center text-sm text-zinc-400">
            Auto-enhance your Strava activities with AI
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => signIn('strava', { callbackUrl: '/dashboard' })}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-95"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
            <path d="M11.379 7.956l2.084 4.1h3.066L11.379 2 6.229 12.056h3.066l2.084-4.1z" />
          </svg>
          Login with Strava
        </button>

        <p className="mt-6 text-center text-xs text-zinc-500">
          You&apos;ll be redirected to Strava to authorise access.
          <br />
          No data is shared with third parties.
        </p>
      </div>
    </main>
  );
}
