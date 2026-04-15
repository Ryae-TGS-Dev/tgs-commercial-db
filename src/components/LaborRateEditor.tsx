'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Check, Pencil } from 'lucide-react';

export function LaborRateEditor({ currentRate }: { currentRate: number }) {
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(currentRate.toFixed(2));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'labor_rate_per_hour', value: rate, updated_at: new Date().toISOString() });
    setSaving(false);
    if (!error) {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert('Failed to save labor rate.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
        <DollarSign size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Labor Rate (per man-hour)</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          Cost = hours × crew count × rate. Used to calculate total labor cost per service visit.
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {editing ? (
          <>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 600 }}>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                style={{ paddingLeft: 22, width: 100, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
              />
            </div>
            <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 80 }}>
              {saving ? 'Saving...' : <><Check size={14} /> Save</>}
            </button>
          </>
        ) : (
          <>
            <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
              ${parseFloat(rate).toFixed(2)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>/hr</span>
            </span>
            {saved && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ Saved</span>}
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
