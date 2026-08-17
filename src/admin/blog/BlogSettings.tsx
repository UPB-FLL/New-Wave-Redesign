import { useState } from 'react';
import { Save, Zap } from 'lucide-react';

interface BlogSettingsProps {
  onSave?: (settings: BlogSettingsState) => void;
}

export interface BlogSettingsState {
  aiModel: 'gpt-4' | 'gpt-4o-mini';
  categoryWeights: Record<string, number>;
  generationDay: number;
  generationHour: number;
  trendFocus: number;
}

const DEFAULT_SETTINGS: BlogSettingsState = {
  aiModel: 'gpt-4o-mini',
  categoryWeights: {
    'Managed IT Services': 1,
    'Cybersecurity': 1,
    'Cloud Solutions': 1,
    'Network Infrastructure': 1,
    'Microsoft 365': 1,
    'IT Support': 1,
    'Backup & Disaster Recovery': 1,
  },
  generationDay: 0, // Sunday
  generationHour: 2, // 2 AM
  trendFocus: 0.4, // 40% trends, 60% service-focused
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BlogSettings({ onSave }: BlogSettingsProps) {
  const [settings, setSettings] = useState<BlogSettingsState>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave?.(settings);
      alert('Settings saved successfully!');
    }, 500);
  }

  async function handleTestGeneration() {
    if (!confirm('Generate a test blog post? This will create a real post in your database.')) {
      return;
    }

    setTestGenerating(true);
    try {
      const response = await fetch('/api/blog/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': import.meta.env.VITE_ADMIN_API_KEY || '',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const data = await response.json();
      alert(`Test post generated: "${data.title}"`);
    } catch (err) {
      console.error('Test generation failed:', err);
      alert('Test generation failed. Check console for details.');
    } finally {
      setTestGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Blog Settings</h2>
          <p className="text-sm text-white/50 mt-1">Configure AI generation parameters and schedule</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
        >
          <Save size={16} className={saving ? 'animate-pulse' : ''} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* AI Model */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">AI Model</h3>
          <select
            value={settings.aiModel}
            onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value as 'gpt-4' | 'gpt-4o-mini' }))}
            className="w-full px-4 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-teal-500/50"
          >
            <option value="gpt-4o-mini" className="bg-gray-800">
              GPT-4o-mini (Fast, Cost-effective)
            </option>
            <option value="gpt-4" className="bg-gray-800">
              GPT-4 (Higher quality for trend analysis)
            </option>
          </select>
        </div>

        {/* Content Balance */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Content Focus</h3>
          <div className="space-y-2">
            <label className="text-xs text-white/70">Trend vs Service Content Balance</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.trendFocus}
              onChange={(e) => setSettings((s) => ({ ...s, trendFocus: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/50">
              <span>{Math.round(settings.trendFocus * 100)}% Trends</span>
              <span>{Math.round((1 - settings.trendFocus) * 100)}% Services</span>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Generation Schedule</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/70 mb-1 block">Day of Week</label>
              <select
                value={settings.generationDay}
                onChange={(e) => setSettings((s) => ({ ...s, generationDay: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                {DAYS.map((day, i) => (
                  <option key={day} value={i} className="bg-gray-800">
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 block">Hour (ET)</label>
              <select
                value={settings.generationHour}
                onChange={(e) => setSettings((s) => ({ ...s, generationHour: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:ring-2 focus:ring-teal-500/50"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i} className="bg-gray-800">
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Test Generation */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-4">Test Generation</h3>
          <button
            onClick={handleTestGeneration}
            disabled={testGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all"
          >
            <Zap size={16} className={testGenerating ? 'animate-pulse' : ''} />
            {testGenerating ? 'Generating...' : 'Generate Test Post'}
          </button>
          <p className="text-xs text-white/50 mt-2 text-center">
            This will create a real blog post using current settings
          </p>
        </div>
      </div>
    </div>
  );
}
