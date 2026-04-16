'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Check, X, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type LeaderEntry = { crew_leader: string; visits: number };

export function CrewLeaderMerger() {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [canonical, setCanonical] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLeaders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from('service_history')
        .select('crew_leader')
        .not('crew_leader', 'is', null)
        .neq('crew_leader', '');
      if (rows) {
        const counts: Record<string, number> = {};
        rows.forEach((r: any) => { counts[r.crew_leader] = (counts[r.crew_leader] || 0) + 1; });
        setLeaders(
          Object.entries(counts)
            .map(([crew_leader, visits]) => ({ crew_leader, visits }))
            .sort((a, b) => a.crew_leader.localeCompare(b.crew_leader))
        );
      }
    } catch (err) {
      console.error('Failed to load crew leaders', err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => { fetchLeaders(); }, [fetchLeaders]);

  const filtered = leaders.filter(l =>
    !search || l.crew_leader.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name];
      // Auto-fill canonical with the selected entry that has the most visits
      if (next.length > 0) {
        const best = leaders.filter(l => next.includes(l.crew_leader)).sort((a, b) => b.visits - a.visits)[0];
        setCanonical(best?.crew_leader || '');
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (!canonical.trim() || selected.length < 1) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('service_history')
        .update({ crew_leader: canonical.trim() })
        .in('crew_leader', selected);
      if (error) throw error;
      setSaved(true);
      setSelected([]);
      setSearch('');
      setTimeout(() => setSaved(false), 2500);
      fetchLeaders();
    } catch (err) {
      console.error(err);
      alert('Failed to apply crew leader merge.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Selection panel */}
      {selected.length > 0 && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Merging {selected.length} variant{selected.length > 1 ? 's' : ''} → canonical name
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {selected.map(s => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px 2px 8px', fontSize: 12 }}>
                {s}
                <button onClick={() => toggleSelect(s)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: 0 }}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRight size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
            <input
              className="input"
              style={{ flex: 1, fontWeight: 600 }}
              placeholder="Type canonical name…"
              value={canonical}
              onChange={e => setCanonical(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleMerge(); }}
            />
            <button
              className="btn btn-ghost"
              onClick={() => { setSelected([]); setCanonical(''); }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleMerge}
              disabled={saving || !canonical.trim()}
              style={{ minWidth: 120 }}
            >
              {saving ? 'Applying…' : <><Check size={13} /> Apply Merge</>}
            </button>
            {saved && <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>✓ Done</span>}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          className="input"
          style={{ paddingLeft: 34, width: '100%' }}
          placeholder="Search crew leader names…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading ? (
          <div style={{ color: 'var(--text-subtle)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-subtle)', fontSize: 13, textAlign: 'center', padding: 24 }}>No results for &quot;{search}&quot;</div>
        ) : (
          filtered.map(({ crew_leader, visits }) => {
            const isSelected = selected.includes(crew_leader);
            // Split on comma, &, or 'and' — first part is crew leader, rest are members
            const parts = crew_leader.split(/,|&|\band\b/i).map((s: string) => s.trim()).filter(Boolean);
            const leaderName = parts[0];
            const memberNames = parts.slice(1);
            return (
              <label
                key={crew_leader}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 8, cursor: 'pointer',
                  background: isSelected ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--accent-border)' : 'transparent'}`,
                  transition: 'all 0.1s',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(crew_leader)}
                  style={{ flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {leaderName}
                    {memberNames.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                        +crew: {memberNames.join(', ')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                    {visits} service visit{visits !== 1 ? 's' : ''}
                  </div>
                </div>
                {isSelected && <Check size={13} color="var(--accent)" />}
              </label>
            );
          })

        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-subtle)' }}>
        {filtered.length} unique leader entries · Select variants of the same person → type canonical name → Apply Merge
      </div>
    </div>
  );
}
