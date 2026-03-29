'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle2, EyeOff, XCircle, Clock, RefreshCw } from 'lucide-react';
import type { ActivityLogDoc, SettingsDoc } from '@/lib/types';

interface LogWithId extends ActivityLogDoc {
  id: string;
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}

function StatsCard({ label, value, icon, sub }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-400">{label}</p>
        <span className="text-zinc-500">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
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

function timeAgo(ts: { _seconds: number } | undefined): string {
  if (!ts) return '—';
  const diff = Math.floor(Date.now() / 1000) - ts._seconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardOverview() {
  const [logs, setLogs] = useState<LogWithId[]>([]);
  const [settings, setSettings] = useState<SettingsDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [logRes, settingsRes] = await Promise.all([
        fetch('/api/logs?limit=5', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);
      if (logRes.ok) {
        const logPage = await logRes.json();
        setLogs(logPage.logs ?? []);
      }
      if (settingsRes.ok) {
        setSettings(await settingsRes.json());
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds to pick up newly processed activities
    const interval = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const successCount = logs.filter((l) => l.status === 'success').length;
  const hiddenCount = logs.filter((l) => l.actionsApplied?.hiddenFromHomeFeed).length;
  const aiNamedCount = logs.filter((l) => l.actionsApplied?.aiName).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Overview</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Recent processing activity and system status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div
        className={`mb-6 flex items-center gap-3 rounded-xl border px-5 py-4 ${
          settings?.processingEnabled
            ? 'border-green-500/30 bg-green-500/5 text-green-400'
            : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            settings?.processingEnabled ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
          }`}
        />
        <span className="text-sm font-medium">
          {loading
            ? 'Loading…'
            : settings?.processingEnabled
            ? 'Processing is active — new activities will be auto-enhanced.'
            : 'Processing is paused — activities will not be modified.'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <StatsCard
          label="Recent Processed"
          value={loading ? '—' : logs.length}
          icon={<Activity size={16} />}
          sub="last 5 activities"
        />
        <StatsCard
          label="Successful"
          value={loading ? '—' : successCount}
          icon={<CheckCircle2 size={16} />}
        />
        <StatsCard
          label="AI Named"
          value={loading ? '—' : aiNamedCount}
          icon={<Bot size={16} />}
        />
        <StatsCard
          label="Hidden from Feed"
          value={loading ? '—' : hiddenCount}
          icon={<EyeOff size={16} />}
        />
      </div>

      {/* Recent logs table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Recent Activities</h2>
          <a href="/dashboard/logs" className="text-xs text-orange-400 hover:underline">
            View all →
          </a>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-500">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-500">
            No activities processed yet. Save a ride on Strava to trigger the pipeline!
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {log.actionsApplied?.aiName ?? log.activityName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {log.activityType} · {(log.distanceMeters / 1000).toFixed(1)} km ·{' '}
                    {timeAgo(log.processedAt as unknown as { _seconds: number })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {log.actionsApplied?.hiddenFromHomeFeed && (
                    <span title="Hidden from feed" className="text-zinc-500">
                      <EyeOff size={13} />
                    </span>
                  )}
                  {statusBadge(log.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
