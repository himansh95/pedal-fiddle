'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ChevronDown, CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import type { ActivityLogDoc } from '@/lib/types';

interface LogWithId extends ActivityLogDoc {
  id: string;
}

interface LogPage {
  logs: LogWithId[];
  nextCursor: string | null;
}

function statusBadge(status: ActivityLogDoc['status']) {
  if (status === 'success')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
        <CheckCircle2 size={10} /> success
      </span>
    );
  if (status === 'failed')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
        <XCircle size={10} /> failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs font-medium text-zinc-400">
      <Clock size={10} /> skipped
    </span>
  );
}

function formatDate(ts: { _seconds: number } | undefined): string {
  if (!ts) return '—';
  return new Date(ts._seconds * 1000).toLocaleString();
}

function LogDetail({ log, onClose }: { log: LogWithId; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              {log.actionsApplied?.aiName ?? log.activityName}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {log.activityType} · {(log.distanceMeters / 1000).toFixed(1)} km ·{' '}
              {formatDate(log.processedAt as unknown as { _seconds: number })}
            </p>
          </div>
          {statusBadge(log.status)}
        </div>

        {log.errorMessage && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            {log.errorMessage}
          </div>
        )}

        <DetailSection title="Actions Applied">
          <div className="text-xs space-y-1 text-zinc-300">
            {log.actionsApplied?.aiName && (
              <p><span className="text-zinc-500">AI Name:</span> {log.actionsApplied.aiName}</p>
            )}
            {log.actionsApplied?.aiDescription && (
              <p><span className="text-zinc-500">AI Description:</span> {log.actionsApplied.aiDescription}</p>
            )}
            {log.actionsApplied?.hiddenFromHomeFeed !== undefined && (
              <p><span className="text-zinc-500">Hidden from feed:</span> {log.actionsApplied.hiddenFromHomeFeed ? 'Yes' : 'No'}</p>
            )}
            {log.actionsApplied?.gearId && (
              <p>
                <span className="text-zinc-500">Gear assigned:</span>{' '}
                {log.actionsApplied.gearLabel
                  ? `${log.actionsApplied.gearLabel} (${log.actionsApplied.gearId})`
                  : log.actionsApplied.gearId}
              </p>
            )}
            {log.locationResolved && (
              <p><span className="text-zinc-500">Location resolved:</span> {log.locationResolved}</p>
            )}
            {Object.keys(log.actionsApplied ?? {}).length === 0 && (
              <p className="text-zinc-500">None</p>
            )}
          </div>
        </DetailSection>

        {log.aiPromptUsed && (
          <DetailSection title="Prompt Used">
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">
              {log.aiPromptUsed}
            </pre>
          </DetailSection>
        )}

        {log.aiResponseRaw && (
          <DetailSection title="AI Response">
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">
              {log.aiResponseRaw}
            </pre>
          </DetailSection>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-3">
      <p className="text-xs font-medium text-zinc-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogWithId[]>([]);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<LogWithId | null>(null);

  const load = useCallback(
    async (reset = false) => {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({ limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      // On reset, always fetch from the top (ignore cursor)
      if (!reset && cursorRef.current) params.set('cursor', cursorRef.current);

      const data: LogPage = await fetch(`/api/logs?${params}`, { cache: 'no-store' }).then((r) => r.json());

      cursorRef.current = data.nextCursor;
      setLogs((prev) => (reset ? data.logs : [...prev, ...data.logs]));
      setHasMore(!!data.nextCursor);
      setLoading(false);
      setLoadingMore(false);
    },
    [statusFilter],
  );

  useEffect(() => {
    cursorRef.current = null;
    load(true);
    // Auto-refresh every 30 seconds to pick up newly processed activities
    const interval = setInterval(() => {
      cursorRef.current = null;
      load(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity size={22} /> Activity Logs
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Full history of every processed activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['', 'success', 'failed', 'skipped'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
            }`}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[1fr_120px_90px_90px_80px] gap-4 px-5 py-3 text-xs font-medium text-zinc-500 border-b border-zinc-800">
          <span>Activity</span>
          <span>Type</span>
          <span>Distance</span>
          <span>Processed</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="animate-spin text-zinc-500" size={22} />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            No logs found.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {logs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelected(log)}
                className="w-full text-left hover:bg-zinc-800/50 transition-colors"
              >
                <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_90px_90px_80px] gap-4 items-center px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {log.actionsApplied?.aiName ?? log.activityName}
                    </p>
                    {log.actionsApplied?.aiName && (
                      <p className="text-xs text-zinc-500 truncate">
                        was: {log.activityName}
                      </p>
                    )}
                  </div>
                  <span className="hidden sm:block text-sm text-zinc-400">{log.activityType}</span>
                  <span className="hidden sm:block text-sm text-zinc-400">
                    {(log.distanceMeters / 1000).toFixed(1)} km
                  </span>
                  <span className="hidden sm:block text-xs text-zinc-500">
                    {formatDate(log.processedAt as unknown as { _seconds: number })}
                  </span>
                  {statusBadge(log.status)}
                </div>
              </button>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="border-t border-zinc-800 px-5 py-3 flex justify-center">
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ChevronDown size={14} />
              )}
              Load more
            </button>
          </div>
        )}
      </div>

      {selected && <LogDetail log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
