'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { CheckCircle2, Loader2, RefreshCw, Zap, ZapOff } from 'lucide-react';
import Image from 'next/image';

interface WebhookStatus {
  subscriptionId: string | null;
}

export default function StravaPage() {
  const { data: session } = useSession();
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadWebhookStatus() {
    // We get the subscription ID from the user record by reading settings
    // (the setup route returns it). We infer status from settings endpoint for now
    // — let's just try registering to see if one exists
    setLoading(false);
  }

  // Fetch current webhook state from a lightweight user endpoint
  async function fetchUserState() {
    setLoading(true);
    const res = await fetch('/api/setup/webhook', { method: 'GET' }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      setWebhookStatus({ subscriptionId: data.subscriptionId ?? null });
    }
    setLoading(false);
  }

  useEffect(() => {
    // Try GET to see subscription status
    fetch('/api/setup/webhook')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setWebhookStatus({ subscriptionId: data?.subscriptionId ?? null });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function registerWebhook() {
    setActionLoading(true);
    setError('');
    setMessage('');
    const res = await fetch('/api/setup/webhook', { method: 'POST' });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Registration failed');
    } else {
      setWebhookStatus({ subscriptionId: data.subscriptionId });
      setMessage('Webhook registered successfully!');
    }
  }

  async function deregisterWebhook() {
    setActionLoading(true);
    setError('');
    setMessage('');
    const res = await fetch('/api/setup/webhook', { method: 'DELETE' });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Deregistration failed');
    } else {
      setWebhookStatus({ subscriptionId: null });
      setMessage('Webhook removed.');
    }
  }

  const isConnected = !!webhookStatus?.subscriptionId;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap size={22} /> Strava Connection
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your Strava athlete connection and webhook subscription.
        </p>
      </div>

      {/* Athlete card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Connected Athlete</h2>
        <div className="flex items-center gap-4">
          {session?.user?.image && (
            <Image
              src={session.user.image}
              alt="Profile"
              width={52}
              height={52}
              className="rounded-full border-2 border-orange-500"
            />
          )}
          <div>
            <p className="font-semibold text-white">{session?.user?.name ?? '—'}</p>
            <p className="text-sm text-zinc-400 mt-0.5">
              Athlete ID: <span className="font-mono text-zinc-300">{session?.user?.id ?? '—'}</span>
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
            <CheckCircle2 size={12} /> Connected
          </span>
        </div>
      </div>

      {/* Webhook card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Webhook Subscription</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Strava sends real-time activity events to Pedal Fiddle via a webhook.
              This must be registered for auto-processing to work.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchUserState}
            className="ml-4 shrink-0 rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 size={16} className="animate-spin" /> Checking…
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-zinc-600'}`}
            />
            <span className="text-sm text-zinc-300">
              {isConnected
                ? `Active — subscription ID: ${webhookStatus!.subscriptionId}`
                : 'No active webhook subscription'}
            </span>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
        )}
        {message && (
          <p className="text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2">{message}</p>
        )}

        <div className="flex gap-3">
          {!isConnected ? (
            <button
              type="button"
              onClick={registerWebhook}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Register Webhook
            </button>
          ) : (
            <button
              type="button"
              onClick={deregisterWebhook}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-colors disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ZapOff size={14} />
              )}
              Remove Webhook
            </button>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 px-4 py-3 text-xs text-zinc-400 space-y-1">
          <p className="font-medium text-zinc-300">Callback URL</p>
          <p className="font-mono break-all">
            {process.env.NEXT_PUBLIC_APP_URL ?? typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/strava` : '…'}
          </p>
        </div>
      </div>
    </div>
  );
}
