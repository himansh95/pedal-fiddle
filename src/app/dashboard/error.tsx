'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[dashboard] error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle size={28} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-1 text-sm text-zinc-400 max-w-sm">
          {error.message || 'An unexpected error occurred in the dashboard.'}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-zinc-600">Digest: {error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
