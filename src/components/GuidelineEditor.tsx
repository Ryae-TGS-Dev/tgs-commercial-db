'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

export function GuidelineEditor({ isPowerUser = true }: { isPowerUser?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [guidelines, setGuidelines] = useState({
    service: '',
    crew: ''
  });

  useEffect(() => {
    const fetchGuidelines = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['guideline_service_performed', 'guideline_crew_name']);
      
      if (data) {
        const map = Object.fromEntries(data.map((s: any) => [s.key, s.value]));
        setGuidelines({
          service: map['guideline_service_performed'] || '',
          crew: map['guideline_crew_name'] || ''
        });
      }
      setLoading(false);
    };
    fetchGuidelines();
  }, []);

  const handleSave = async () => {
    if (!isPowerUser) return;
    setSaving(true);
    setStatus('idle');

    try {
      const updates = [
        { key: 'guideline_service_performed', value: guidelines.service },
        { key: 'guideline_crew_name', value: guidelines.crew }
      ];

      const { error } = await supabase
        .from('app_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-zinc-500">Loading guidelines...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Two columns side-by-side with equal flex */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
            whiteSpace: 'nowrap'
          }}>
            Service Description
          </label>
          <textarea
            className="input"
            rows={4}
            disabled={!isPowerUser}
            value={guidelines.service}
            onChange={(e) => setGuidelines({ ...guidelines, service: e.target.value })}
            placeholder="Standard: Fertilized [Area] with [Product]..."
            style={{ fontSize: 12, lineHeight: '1.5', width: '100%', resize: 'vertical' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
            whiteSpace: 'nowrap'
          }}>
            Crew Name Format
          </label>
          <textarea
            className="input"
            rows={4}
            disabled={!isPowerUser}
            value={guidelines.crew}
            onChange={(e) => setGuidelines({ ...guidelines, crew: e.target.value })}
            placeholder="Standard format: First Last"
            style={{ fontSize: 12, lineHeight: '1.5', width: '100%', resize: 'vertical' }}
          />
        </div>
      </div>

      {isPowerUser && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          {status === 'success' && (
            <div style={{ color: 'var(--accent)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={13} /> Guidelines updated
            </div>
          )}
          {status === 'error' && (
            <div style={{ color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={13} /> Error saving changes
            </div>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={saving}
            style={{ fontSize: 12 }}
          >
            <Save size={13} />
            {saving ? 'Saving...' : 'Save Guidelines'}
          </button>
        </div>
      )}
    </div>
  );
}
