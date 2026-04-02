'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { DEFAULT_DESCRIPTION_PROMPT, DEFAULT_NAME_PROMPT } from '@/lib/defaults';

interface Settings {
  processingEnabled: boolean;
  aiNameEnabled: boolean;
  aiDescriptionEnabled: boolean;
  aiProvider: 'groq' | 'gemini';
  aiApiKey: string;
  defaultTone: string;
  namePromptTemplate: string;
  descriptionPromptTemplate: string;
}

const TONES = ['motivational', 'humorous', 'poetic', 'technical', 'casual', 'roast'];

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-4 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          checked ? 'bg-orange-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </div>
    </label>
  );
}

export default function AIConfigPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [previewType, setPreviewType] = useState<'name' | 'description'>('name');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOutput, setPreviewOutput] = useState<{ prompt: string; output: string } | null>(null);
  const [previewError, setPreviewError] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) setSettings(await res.json());
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    // Re-fetch so the UI reflects exactly what was persisted
    // (e.g. API key becomes masked ●●●●●●●● and provider is confirmed)
    await fetchSettings();
    setSaving(false);
    setSaved(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaved(false), 3000);
  }

  async function runPreview() {
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewOutput(null);
    const res = await fetch('/api/ai/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: previewType,
        template:
          previewType === 'name'
            ? settings?.namePromptTemplate
            : settings?.descriptionPromptTemplate,
        tone: settings?.defaultTone,
      }),
    });
    const data = await res.json();
    setPreviewLoading(false);
    if (!res.ok) {
      const raw: string = data.error ?? 'Preview failed';
      const friendly = raw.includes('429') || raw.toLowerCase().includes('rate limit')
        ? 'Rate limit hit (429). The free tier allows ~15 requests/min. Wait a moment and try again.'
        : raw;
      setPreviewError(friendly);
    } else {
      setPreviewOutput(data);
    }
  }

  if (!settings) {
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
          <Bot size={22} /> AI Configuration
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure your AI provider, tone, and prompt templates.
        </p>
      </div>

      {/* Provider card */}
      <Section title="Provider & API Key">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Provider</label>
            <div className="flex gap-3">
              {(['groq', 'gemini'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update('aiProvider', p)}
                  className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    settings.aiProvider === p
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {p === 'groq' ? 'Groq (llama-3.3-70b)' : 'Gemini (2.0 Flash)'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.aiApiKey}
                onChange={(e) => update('aiApiKey', e.target.value)}
                placeholder="Paste your API key…"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-2 text-zinc-500 hover:text-white"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              Stored encrypted. Leave as ●●●●●●●● to keep existing key.
            </p>
          </div>
        </div>
      </Section>

      {/* Feature toggles */}
      <Section title="Features">
        <div className="space-y-4">
          <Toggle
            checked={settings.aiNameEnabled}
            onChange={(v) => update('aiNameEnabled', v)}
            label="AI Activity Names"
            description="Replaces default Strava name with an AI-generated one."
          />
          <Toggle
            checked={settings.aiDescriptionEnabled}
            onChange={(v) => update('aiDescriptionEnabled', v)}
            label="AI Descriptions"
            description="Writes a narrative description for each activity."
          />
        </div>
      </Section>

      {/* Tone */}
      <Section title="Default Tone">
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update('defaultTone', t)}
              className={`rounded-full border px-3.5 py-1 text-xs font-medium capitalize transition-colors ${
                settings.defaultTone === t
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Section>

      {/* Prompt templates */}
      <Section title="Prompt Templates">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-400">Name Prompt</label>
              <button
                type="button"
                onClick={() => update('namePromptTemplate', DEFAULT_NAME_PROMPT)}
                className="text-xs text-zinc-500 hover:text-orange-400"
              >
                Reset to default
              </button>
            </div>
            <textarea
              rows={8}
              value={settings.namePromptTemplate}
              onChange={(e) => update('namePromptTemplate', e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-y"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-400">Description Prompt</label>
              <button
                type="button"
                onClick={() => update('descriptionPromptTemplate', DEFAULT_DESCRIPTION_PROMPT)}
                className="text-xs text-zinc-500 hover:text-orange-400"
              >
                Reset to default
              </button>
            </div>
            <textarea
              rows={10}
              value={settings.descriptionPromptTemplate}
              onChange={(e) => update('descriptionPromptTemplate', e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-y"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Available tokens: {'{{'} activity_type {'}}'}, {'{{'} distance_km {'}}'}, {'{{'} duration_min {'}}'},{' '}
            {'{{'} elevation_m {'}}'}, {'{{'} avg_pace {'}}'}, {'{{'} avg_hr {'}}'}, {'{{'} calories {'}}'},{' '}
            {'{{'} time_of_day {'}}'}, {'{{'} location {'}}'}, {'{{'} tone {'}}'}
          </p>
        </div>
      </Section>

      {/* Preview */}
      <Section title="Preview">
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="flex rounded-lg overflow-hidden border border-zinc-700">
              {(['name', 'description'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPreviewType(t)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    previewType === t
                      ? 'bg-orange-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={runPreview}
              disabled={previewLoading}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
            >
              {previewLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              Run preview
            </button>
          </div>

          {previewError && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {previewError}
            </p>
          )}

          {previewOutput && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">Resolved prompt</p>
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">
                  {previewOutput.prompt}
                </pre>
              </div>
              <div className="border-t border-zinc-700 pt-3">
                <p className="text-xs font-medium text-zinc-400 mb-1">AI output</p>
                <p className="text-sm text-white">{previewOutput.output}</p>
              </div>
            </div>
          )}
        </div>
      </Section>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-sm font-semibold text-white mb-5">{title}</h2>
      {children}
    </div>
  );
}
