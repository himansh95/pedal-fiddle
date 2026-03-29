'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Settings } from 'lucide-react';

interface GeneralSettings {
  processingEnabled: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => setSettings({ processingEnabled: s.processingEnabled ?? true }));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    // Re-fetch to confirm persisted value
    const s = await fetch('/api/settings').then((r) => r.json());
    setSettings({ processingEnabled: s.processingEnabled ?? true });
    setSaving(false);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 3000);
  }

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={22} /> Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Global processing controls.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-6">
        <h2 className="text-sm font-semibold text-white">Processing</h2>

        <label className="flex items-start gap-4 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={settings.processingEnabled}
            onClick={() => {
              setSettings((s) => s ? { ...s, processingEnabled: !s.processingEnabled } : s);
              setSaved(false);
            }}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              settings.processingEnabled ? 'bg-orange-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                settings.processingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-white">Enable processing</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              When turned off, incoming Strava webhooks are received but no changes are made
              to your activities. Useful for pausing without losing your config.
            </p>
          </div>
        </label>

        <div
          className={`rounded-lg border px-4 py-3 text-xs ${
            settings.processingEnabled
              ? 'border-green-500/30 bg-green-500/5 text-green-400'
              : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400'
          }`}
        >
          {settings.processingEnabled
            ? '✓ Processing is active. New activities will be auto-enhanced.'
            : '⏸ Processing is paused. Activities will be logged as skipped.'}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
        {saved && <span className="text-sm text-green-400">Saved ✓</span>}
      </div>
    </div>
  );
}
