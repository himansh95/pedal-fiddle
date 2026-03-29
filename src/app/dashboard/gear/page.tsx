'use client';

import { useEffect, useRef, useState } from 'react';
import { Bike, Loader2, Plus, Trash2 } from 'lucide-react';
import type { GearRule } from '@/lib/types';

const ACTIVITY_TYPES = [
  'Ride',
  'VirtualRide',
  'EBikeRide',
  'MountainBikeRide',
  'GravelRide',
  'Run',
  'VirtualRun',
  'TrailRun',
  'Walk',
  'Hike',
  'Swim',
  'Workout',
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

function newRule(): GearRule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    label: '',
    gearId: '',
    locationCity: '',
    activityTypes: [],
  };
}

export default function GearRulesPage() {
  const [rules, setRules] = useState<GearRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        setRules(s.gearRules ?? []);
        setLoading(false);
      });
  }, []);

  function updateRule(id: string, patch: Partial<GearRule>) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function toggleActivityType(id: string, type: string) {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.activityTypes.includes(type);
        return {
          ...r,
          activityTypes: has
            ? r.activityTypes.filter((t) => t !== type)
            : [...r.activityTypes, type],
        };
      }),
    );
    setSaved(false);
  }

  function addRule() {
    setRules((prev) => [...prev, newRule()]);
    setSaved(false);
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gearRules: rules }),
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
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bike size={22} /> Gear Rules
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Automatically assign a Strava gear (bike) to activities based on where they start.
          The first matching enabled rule wins.
        </p>
      </div>

      {/* How to find Gear ID */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400 space-y-1">
        <p className="font-semibold text-zinc-300">How to find your Strava Gear ID</p>
        <p>
          Go to <span className="text-orange-400">strava.com/settings/gear</span>, click on a bike,
          and copy the ID from the URL — it looks like <code className="bg-zinc-800 px-1 rounded">b12345678</code>.
        </p>
      </div>

      <div className="space-y-4">
        {rules.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
            No gear rules yet. Click &ldquo;Add Rule&rdquo; to create one.
          </div>
        )}

        {rules.map((rule, idx) => (
          <div
            key={rule.id}
            className={`rounded-xl border p-5 space-y-4 transition-colors ${
              rule.enabled ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800 bg-zinc-950 opacity-60'
            }`}
          >
            {/* Header row */}
            <div className="flex items-center gap-3">
              <Toggle checked={rule.enabled} onChange={(v) => updateRule(rule.id, { enabled: v })} />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Rule {idx + 1}
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="rounded-md p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                title="Delete rule"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Label</label>
                <input
                  type="text"
                  value={rule.label}
                  onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                  placeholder="e.g. Bhopal Bike"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Gear ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Strava Gear ID</label>
                <input
                  type="text"
                  value={rule.gearId}
                  onChange={(e) => updateRule(rule.id, { gearId: e.target.value.trim() })}
                  placeholder="e.g. b12345678"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none font-mono"
                />
              </div>

              {/* Location city */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-zinc-400">
                  Location City{' '}
                  <span className="text-zinc-600 font-normal">(case-insensitive substring match)</span>
                </label>
                <input
                  type="text"
                  value={rule.locationCity}
                  onChange={(e) => updateRule(rule.id, { locationCity: e.target.value })}
                  placeholder="e.g. Bhopal"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
                />
                <p className="text-xs text-zinc-600">
                  Matches against the city Strava detects for the activity start location.
                </p>
              </div>
            </div>

            {/* Activity types */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400">
                Activity Types{' '}
                <span className="text-zinc-600 font-normal">
                  (leave empty to match all types)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_TYPES.map((type) => {
                  const active = rule.activityTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleActivityType(rule.id, type)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={addRule}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus size={14} /> Add Rule
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>

        {saved && <span className="text-sm text-green-400">Saved ✓</span>}
      </div>
    </div>
  );
}
