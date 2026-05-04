import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';

interface ThreatDetail {
  name: string;
  slug: string;
  severity: string;
  description: string;
  details: string;
  mitigation_strategies: string[];
  impact: string;
}

const defaultThreats: ThreatDetail[] = [
  { name: 'Ransomware', slug: 'ransomware', severity: 'CRITICAL', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'Phishing', slug: 'phishing', severity: 'HIGH', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'DDoS Attacks', slug: 'ddos-attacks', severity: 'HIGH', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'Data Breaches', slug: 'data-breaches', severity: 'CRITICAL', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'Zero-Day Exploits', slug: 'zero-day-exploits', severity: 'CRITICAL', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'Insider Threats', slug: 'insider-threats', severity: 'MEDIUM', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'Network Intrusions', slug: 'network-intrusions', severity: 'HIGH', description: '', details: '', mitigation_strategies: [], impact: '' },
  { name: 'Compliance Violations', slug: 'compliance-violations', severity: 'MEDIUM', description: '', details: '', mitigation_strategies: [], impact: '' },
];

export default function ThreatsDetailEditor() {
  const [threats, setThreats] = useState<ThreatDetail[]>(defaultThreats);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSectionContent('threats-detail').then((data) => {
      try {
        setThreats(JSON.parse(data.threats_list || '[]'));
      } catch {
        setThreats(defaultThreats);
      }
      setLoaded(true);
    });
  }, []);

  const updateThreat = (idx: number, field: keyof ThreatDetail, value: any) => {
    setThreats((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  };

  const addStrategy = (idx: number) => {
    setThreats((prev) =>
      prev.map((t, i) =>
        i === idx ? { ...t, mitigation_strategies: [...t.mitigation_strategies, ''] } : t
      )
    );
  };

  const removeStrategy = (idx: number, sIdx: number) => {
    setThreats((prev) =>
      prev.map((t, i) =>
        i === idx
          ? { ...t, mitigation_strategies: t.mitigation_strategies.filter((_, si) => si !== sIdx) }
          : t
      )
    );
  };

  const updateStrategy = (idx: number, sIdx: number, value: string) => {
    setThreats((prev) =>
      prev.map((t, i) =>
        i === idx
          ? { ...t, mitigation_strategies: t.mitigation_strategies.map((s, si) => (si === sIdx ? value : s)) }
          : t
      )
    );
  };

  const handleSave = async () => {
    await upsertManyContent('threats-detail', {
      threats_list: JSON.stringify(threats),
    });
  };

  if (!loaded) return <div className="text-white/50">Loading…</div>;

  return (
    <SectionEditor title="Threat Details" description="Detailed pages for each threat type" onSave={handleSave}>
      <div className="space-y-6">
        {threats.map((threat, i) => (
          <FormSection key={i} title={threat.name} subtitle={`Manage details for ${threat.name}`}>
            <EditorField
              label="Threat Name"
              value={threat.name}
              onChange={(v) => updateThreat(i, 'name', v)}
            />
            <EditorField
              label="URL Slug"
              value={threat.slug}
              onChange={(v) => updateThreat(i, 'slug', v)}
              hint="Used in /threat/:slug"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Severity</label>
                <select
                  value={threat.severity}
                  onChange={(e) => updateThreat(i, 'severity', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-all focus:ring-2"
                  style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                >
                  <option>CRITICAL</option>
                  <option>HIGH</option>
                  <option>MEDIUM</option>
                </select>
              </div>
              <EditorField
                label="Impact Statement"
                value={threat.impact}
                onChange={(v) => updateThreat(i, 'impact', v)}
                hint="e.g. 'Encryption of critical data'"
              />
            </div>
            <EditorField
              label="Short Description"
              value={threat.description}
              onChange={(v) => updateThreat(i, 'description', v)}
              multiline
              rows={2}
              hint="Brief 1-2 sentence summary"
            />
            <EditorField
              label="Detailed Explanation"
              value={threat.details}
              onChange={(v) => updateThreat(i, 'details', v)}
              multiline
              rows={4}
              hint="Full explanation of the threat"
            />

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">Mitigation Strategies</label>
                <button
                  onClick={() => addStrategy(i)}
                  className="text-xs px-2 py-1 rounded bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {threat.mitigation_strategies.map((strategy, sIdx) => (
                  <div key={sIdx} className="flex gap-2">
                    <input
                      type="text"
                      value={strategy}
                      onChange={(e) => updateStrategy(i, sIdx, e.target.value)}
                      placeholder="Enter mitigation strategy"
                      className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 outline-none"
                      style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
                    />
                    <button
                      onClick={() => removeStrategy(i, sIdx)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FormSection>
        ))}
      </div>
    </SectionEditor>
  );
}
