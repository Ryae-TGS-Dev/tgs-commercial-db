'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Ruler, CloudRain, Save, Loader2, CheckCircle2, ListFilter, Plus, X } from 'lucide-react';

export function LogisticsSettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<any>({
    acreage_thresholds: { small: 304920, medium: 740520 },
    rain_threshold: 60,
    service_methods: [
      { label: 'Spray & Granular', value: 'Both' },
      { label: 'Spray Only', value: 'Spray' },
      { label: 'Granular Only', value: 'Granular' }
    ]
  });

  const [newMethodLabel, setNewMethodLabel] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('logistics_settings')
      .select('key, value');
    
    if (data && !error) {
      const map = Object.fromEntries(data.map(s => [s.key, s.value]));
      setSettings({
        acreage_thresholds: map.acreage_thresholds || { small: 304920, medium: 740520 },
        rain_threshold: map.rain_threshold || 60,
        service_methods: map.service_methods || [
          { label: 'Spray & Granular', value: 'Both' },
          { label: 'Spray Only', value: 'Spray' },
          { label: 'Granular Only', value: 'Granular' }
        ]
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    
    const updates = [
      { key: 'acreage_thresholds', value: settings.acreage_thresholds },
      { key: 'rain_threshold', value: settings.rain_threshold },
      { key: 'service_methods', value: settings.service_methods }
    ];

    for (const update of updates) {
      await supabase
        .from('logistics_settings')
        .upsert(update, { onConflict: 'key' });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const addMethod = () => {
    if (!newMethodLabel.trim()) return;
    const newMethod = {
      label: newMethodLabel,
      value: newMethodLabel.replace(/\s+/g, '') // Simple value generation
    };
    setSettings({
      ...settings,
      service_methods: [...settings.service_methods, newMethod]
    });
    setNewMethodLabel('');
  };

  const removeMethod = (index: number) => {
    const newMethods = [...settings.service_methods];
    newMethods.splice(index, 1);
    setSettings({
      ...settings,
      service_methods: newMethods
    });
  };

  if (loading) return <div className="p-4 text-center text-xs text-zinc-400">Loading logistics parameters...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Acreage Thresholds */}
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Ruler size={14} className="text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-tight text-zinc-500">Acreage Thresholds (Sq Ft)</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Small → Medium Breakpoint</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={settings.acreage_thresholds.small}
                  onChange={(e) => setSettings({
                    ...settings, 
                    acreage_thresholds: { ...settings.acreage_thresholds, small: parseInt(e.target.value) }
                  })}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Medium → Large Breakpoint</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  value={settings.acreage_thresholds.medium}
                  onChange={(e) => setSettings({
                    ...settings, 
                    acreage_thresholds: { ...settings.acreage_thresholds, medium: parseInt(e.target.value) }
                  })}
                  className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm w-full font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rain Threshold */}
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CloudRain size={14} className="text-cyan-500" />
            <h3 className="text-xs font-bold uppercase tracking-tight text-zinc-500">Weather Thresholds</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Rain Cancellation Trigger (%)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.rain_threshold}
                  onChange={(e) => setSettings({ ...settings, rain_threshold: parseInt(e.target.value) })}
                  className="flex-1 accent-cyan-500"
                />
                <span className="text-sm font-bold w-12 text-center">{settings.rain_threshold}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Service Methods */}
        <div className="md:col-span-2 lg:col-span-1" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <ListFilter size={14} className="text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-tight text-zinc-500">Global Service Methods</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
               {settings.service_methods.map((method: any, idx: number) => (
                 <div key={idx} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 text-xs font-bold group">
                    {method.label}
                    <button onClick={() => removeMethod(idx)} className="text-emerald-300 hover:text-emerald-600">
                      <X size={12} />
                    </button>
                 </div>
               ))}
            </div>

            <div className="flex items-center gap-2">
               <input 
                type="text"
                placeholder="New method eg: Spot Spray..."
                value={newMethodLabel}
                onChange={(e) => setNewMethodLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMethod()}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs w-full"
               />
               <button onClick={addMethod} className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700">
                 <Plus size={16} />
               </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saved ? '#22c55e' : 'var(--accent)',
            color: 'white',
            padding: '10px 24px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saving ? 'Updating...' : saved ? 'Parameters Saved' : 'Update Logistics Rules'}
        </button>
      </div>
    </div>
  );
}
