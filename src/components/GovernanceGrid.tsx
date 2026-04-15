'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Save, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export function GovernanceGrid() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  
  const [edits, setEdits] = useState<Record<string, { newName: string, newArea: string, newZone: string, newNotes: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('communities')
      .select('id, name, company')
      .order('name');
      
    if (query.trim()) {
      q = q.ilike('name', `%${query}%`);
    }

    const { data } = await q.limit(50);
    setCommunities(data || []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunities();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchCommunities]);

  const handleEditChange = (id: string, field: 'newName' | 'newArea' | 'newZone' | 'newNotes', value: string) => {
    setEdits(prev => {
      const current = prev[id] || { newName: '', newArea: '', newZone: '', newNotes: '' };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleSave = async (id: string, currentName: string) => {
    const edit = edits[id];
    if (!edit) return;
    const newName = edit.newName.trim() || currentName;
    setSavingId(id);
    try {
      const { error } = await supabase.rpc('power_user_update_community', {
        p_source_id: id,
        p_new_name: newName,
        p_new_area: edit.newArea.trim() || null,
        p_new_zone: edit.newZone.trim() || null,
        p_new_note: edit.newNotes.trim() || null
      });
      if (error) throw error;
      setEdits(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchCommunities();
    } catch (err: any) {
      alert("Failed to update: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36, width: '100%' }}
            placeholder="Search communities to fix/merge..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" onClick={() => fetchCommunities()}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
        <table className="tgs-table" style={{ fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
            <tr>
              <th style={{ width: '30%' }}>Original Name</th>
              <th style={{ width: '30%' }}>New Name (Merge)</th>
              <th style={{ width: '20%' }}>Area</th>
              <th style={{ width: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}><RefreshCw className="animate-spin" size={16} /></td></tr>
            ) : communities.map((c) => {
              const edit = edits[c.id] || { newName: '', newArea: '', newZone: '', newNotes: '' };
              const hasChanges = edit.newName || edit.newArea || edit.newZone || edit.newNotes;
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <input className="input" style={{ height: 32, fontSize: 12 }} placeholder={c.name} value={edit.newName} onChange={e => handleEditChange(c.id, 'newName', e.target.value)} />
                  </td>
                  <td>
                    <input className="input" style={{ height: 32, fontSize: 12 }} placeholder="--" value={edit.newArea} onChange={e => handleEditChange(c.id, 'newArea', e.target.value)} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary" style={{ height: 32, padding: '0 10px', opacity: hasChanges ? 1 : 0.5 }} disabled={!hasChanges || savingId === c.id} onClick={() => handleSave(c.id, c.name)}>
                      {savingId === c.id ? '...' : <Save size={14} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
