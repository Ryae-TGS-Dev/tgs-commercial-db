'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Check, X, ArrowRight, Building2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CompanyEntry = { company: string; count: number };

export function CompanyMerger() {
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [canonical, setCanonical] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await supabase
        .from('communities')
        .select('company')
        .not('company', 'is', null)
        .neq('company', '');
      if (rows) {
        const counts: Record<string, number> = {};
        rows.forEach((r: any) => {
          if (r.company) counts[r.company] = (counts[r.company] || 0) + 1;
        });
        setCompanies(
          Object.entries(counts)
            .map(([company, count]) => ({ company, count }))
            .sort((a, b) => a.company.localeCompare(b.company))
        );
      }
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const filtered = companies.filter(c =>
    !search || c.company.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name];
      if (next.length > 0) {
        const best = companies.filter(c => next.includes(c.company)).sort((a, b) => b.count - a.count)[0];
        setCanonical(best?.company || '');
      } else {
        setCanonical('');
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (!canonical.trim() || selected.length < 1) return;
    setSaving(true);
    try {
      // 1. Update communities table
      const { error: commError } = await supabase
        .from('communities')
        .update({ company: canonical.trim() })
        .in('company', selected);
      if (commError) throw commError;

      // 2. Cascade update to service_history to maintain historical tracking
      const { error: histError } = await supabase
        .from('service_history')
        .update({ company: canonical.trim() })
        .in('company', selected);
      if (histError) console.warn("Failed to cascade to service_history:", histError);

      setSaved(true);
      setSelected([]);
      setSearch('');
      setCanonical('');
      setTimeout(() => setSaved(false), 2500);
      fetchCompanies();
    } catch (err) {
      console.error(err);
      alert('Failed to apply company merge.');
    } finally {
      setSaving(false);
    }
  };

  const totalAffected = companies
    .filter(c => selected.includes(c.company))
    .reduce((sum, c) => sum + c.count, 0);

  return (
    <div>
      {/* Selection / action panel */}
      {selected.length > 0 && (
        <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Merging {selected.length} variant{selected.length > 1 ? 's' : ''} &mdash; affects {totalAffected.toLocaleString()} communities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {selected.map(s => {
              const entry = companies.find(c => c.company === s);
              return (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px 2px 8px', fontSize: 12 }}>
                  <Building2 size={10} style={{ color: 'var(--text-muted)' }} />
                  {s}
                  <span style={{ fontSize: 10, color: 'var(--text-subtle)', marginLeft: 2 }}>({entry?.count})</span>
                  <button onClick={() => toggleSelect(s)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: 0, marginLeft: 2 }}>
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRight size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
            <input
              className="input"
              style={{ flex: 1, fontWeight: 600 }}
              placeholder="Type canonical company name…"
              value={canonical}
              onChange={e => setCanonical(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleMerge(); }}
            />
            <button className="btn btn-ghost" onClick={() => { setSelected([]); setCanonical(''); }} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleMerge} disabled={saving || !canonical.trim()} style={{ minWidth: 130 }}>
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
          placeholder="Search company names…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Company list */}
      <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading ? (
          <div style={{ color: 'var(--text-subtle)', fontSize: 13, textAlign: 'center', padding: 24 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-subtle)', fontSize: 13, textAlign: 'center', padding: 24 }}>No results for &quot;{search}&quot;</div>
        ) : (
          filtered.map(({ company, count }) => {
            const isSelected = selected.includes(company);
            return (
              <label
                key={company}
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
                  onChange={() => toggleSelect(company)}
                  style={{ flexShrink: 0 }}
                />
                <Building2 size={13} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {company}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontFamily: 'monospace', fontWeight: 600,
                  color: isSelected ? 'var(--accent)' : 'var(--text-subtle)',
                  background: isSelected ? 'var(--accent-border)' : 'var(--surface-2)',
                  padding: '1px 7px', borderRadius: 10, flexShrink: 0,
                }}>
                  {count} {count === 1 ? 'community' : 'communities'}
                </span>
                {isSelected && <Check size={13} color="var(--accent)" style={{ flexShrink: 0 }} />}
              </label>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-subtle)' }}>
        {filtered.length} unique company names · Select variants → type canonical name → Apply Merge
      </div>
    </div>
  );
}
