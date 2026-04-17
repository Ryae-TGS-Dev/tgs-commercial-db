'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingDown, TrendingUp, DollarSign, Save, Loader2, CheckCircle2 } from 'lucide-react';

export function FinancialSettingsEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<any>({
    overhead_percentage: 20,
    profit_danger_threshold: 10,
    profit_breakeven_threshold: 50
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('financial_settings')
      .select('key, value');
    
    if (data && !error) {
      const map = Object.fromEntries(data.map(s => [s.key, s.value]));
      setSettings({
        overhead_percentage: map.overhead_percentage || 20,
        profit_danger_threshold: map.profit_danger_threshold || 10,
        profit_breakeven_threshold: map.profit_breakeven_threshold || 50
      });
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    
    const updates = [
      { key: 'overhead_percentage', value: String(settings.overhead_percentage) },
      { key: 'profit_danger_threshold', value: String(settings.profit_danger_threshold) },
      { key: 'profit_breakeven_threshold', value: String(settings.profit_breakeven_threshold) }
    ];

    try {
      for (const update of updates) {
        await supabase
          .from('financial_settings')
          .upsert(update, { onConflict: 'key' });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save financial settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-4 text-center text-xs text-zinc-400">Loading strategy parameters...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Overhead & Hidden Costs */}
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={14} className="text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-tight text-zinc-500">Corporate Overhead</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Standard Overhead Deduction (%)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={settings.overhead_percentage}
                  onChange={(e) => setSettings({ ...settings, overhead_percentage: parseInt(e.target.value) })}
                  className="flex-1 accent-zinc-800"
                />
                <span className="text-sm font-bold w-12 text-center">{settings.overhead_percentage}%</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed">
                This percentage will be automatically deducted from a community's gross revenue to account for hidden costs, warehouse, and office staff.
              </p>
            </div>
          </div>
        </div>

        {/* Profit Brackets */}
        <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-tight text-zinc-500">Net Margin Strategy</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                  <TrendingDown size={10} className="text-red-500" /> Danger Zone
                </label>
                <span className="text-[10px] font-bold text-red-500 italic">BELOW {settings.profit_danger_threshold}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="30"
                step="1"
                value={settings.profit_danger_threshold}
                onChange={(e) => setSettings({ ...settings, profit_danger_threshold: parseInt(e.target.value) })}
                className="w-full accent-red-500 h-1.5"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                  <TrendingUp size={10} className="text-emerald-500" /> Target Profit
                </label>
                <span className="text-[10px] font-bold text-emerald-500 italic">ABOVE {settings.profit_breakeven_threshold}%</span>
              </div>
              <input 
                type="range"
                min="31"
                max="80"
                step="1"
                value={settings.profit_breakeven_threshold}
                onChange={(e) => setSettings({ ...settings, profit_breakeven_threshold: parseInt(e.target.value) })}
                className="w-full accent-emerald-500 h-1.5"
              />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
             <div className="flex items-center justify-between text-[10px] font-black uppercase italic text-zinc-400">
                <span>Losing</span>
                <span>Break-Even</span>
                <span>Success</span>
             </div>
             <div className="w-full h-2 rounded-full overflow-hidden flex mt-1">
                <div style={{ width: `${settings.profit_danger_threshold}%` }} className="bg-red-400" />
                <div style={{ width: `${settings.profit_breakeven_threshold - settings.profit_danger_threshold}%` }} className="bg-amber-400" />
                <div style={{ width: `${100 - settings.profit_breakeven_threshold}%` }} className="bg-emerald-400" />
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
          {saving ? 'Updating...' : saved ? 'Strategy Saved' : 'Apply Financial Strategy'}
        </button>
      </div>
    </div>
  );
}
