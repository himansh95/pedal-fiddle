'use client';

import { useEffect, useRef, useState } from 'react';
import { EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_HIDE_RULES } from '@/lib/defaults';
import type { HideRule } from '@/lib/types';

const ACTIVITY_TYPES = [
  'Ride',
  'VirtualRide',
  'EBikeRide',
  'Run',
  'VirtualRun',
  'TrailRun',
  'Walk',
  'Hike',
  'Swim',
  'Workout',
  'WeightTraining',
  'Yoga',
  'Other',
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-orange-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function HideRulesPage() {
  const [rules, setRules] = useState<HideRule[]>([]);
  const [hideEnabled, setHideEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        setRules(s.hideRules ?? DEFAULT_HIDE_RULES);
        setHideEnabled(s.hideFromHomeFeedEnabled ?? true);
        setLoading(false);
      });
  }, []);

  function updateRule(index: number, patch: Partial<HideRule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function addRule() {
    setRules((prev) => [
      ...prev,
      { activityType: 'Ride', enabled: true, distanceThresholdKm: 5 },
    ]);
    setSaved(false);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function resetDefaults() {
    setRules(DEFAULT_HIDE_RULES);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hideFromHomeFeedEnabled: hideEnabled, hideRules: rules }),
    });
    setSaving(false);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <EyeOff size={22} /> Hide Rules
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Automatically hide short activities from your Strava home feed.
        </p>
      </div>

      {/* Master toggle */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <label className="flex items-start gap-4 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-checked={hideEnabled}
            onClick={() => { setHideEnabled((v) => !v); setSaved(false); }}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${
              hideEnabled ? 'bg-orange-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                hideEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-white">Enable hide-from-home-feed</p>
            <p className="text-xs text-zinc-400">
              When on, activities matching the rules below will be marked as hidden from
              your public Strava feed.
            </p>
          </div>
        </label>
      </div>

      {/* Rules table */}
      <div className={`rounded-xl border border-zinc-800 bg-zinc-900 ${!hideEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Rules</h2>
          <button
            type="button"
            onClick={resetDefaults}
            className="text-xs text-zinc-500 hover:text-orange-400"
          >
            Reset to defaults
          </button>
        </div>

        {/* Header row — hidden on mobile, shown on sm+ */}
        <div className="hidden sm:grid grid-cols-[1fr_160px_60px_32px] gap-3 px-5 py-2 text-xs font-medium text-zinc-500 border-b border-zinc-800">
          <span>Activity type</span>
          <span>Hide if under (km)</span>
          <span>Enabled</span>
          <span />
        </div>

        <div className="divide-y divide-zinc-800">
          {rules.map((rule, i) => (
            <div key={i} className="px-5 py-3">
              {/* Mobile layout: stacked card */}
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={rule.activityType}
                    onChange={(e) => updateRule(i, { activityType: e.target.value })}
                    className="flex-1 min-w-0 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs text-zinc-500 shrink-0">Hide if under (km)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0.1}
                      step={0.5}
                      value={rule.distanceThresholdKm}
                      onChange={(e) => updateRule(i, { distanceThresholdKm: parseFloat(e.target.value) || 0 })}
                      className="w-24 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    />
                    <Toggle
                      checked={rule.enabled}
                      onChange={(v) => updateRule(i, { enabled: v })}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop layout: grid row */}
              <div className="hidden sm:grid grid-cols-[1fr_160px_60px_32px] gap-3 items-center">
                <select
                  value={rule.activityType}
                  onChange={(e) => updateRule(i, { activityType: e.target.value })}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={rule.distanceThresholdKm}
                  onChange={(e) => updateRule(i, { distanceThresholdKm: parseFloat(e.target.value) || 0 })}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none w-full"
                />

                <div className="flex justify-center">
                  <Toggle
                    checked={rule.enabled}
                    onChange={(v) => updateRule(i, { enabled: v })}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-800 px-5 py-3">
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-orange-400 transition-colors"
          >
            <Plus size={15} /> Add rule
          </button>
        </div>
      </div>

      {/* Save */}
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
