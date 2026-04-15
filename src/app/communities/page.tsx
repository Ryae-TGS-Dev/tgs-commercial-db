'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Building2, ArrowRight, X, ChevronDown, CheckSquare, Combine, Eye } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CommunityDrawer } from '@/components/CommunityDrawer';

export default function CommunitiesPage() {
  const [query, setQuery] = useState('');
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState('');
  const [companies, setCompanies] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const PAGE = 200;
  const [from, setFrom] = useState(0);
  const [isPowerUser, setIsPowerUser] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);
  const [primaryId, setPrimaryId] = useState('');
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeMap, setMergeMap] = useState<Record<string, 'area' | 'zone' | 'notes' | 'discard'>>({});
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    // Fetch unique companies with no limits to ensure we see every name in the dropdown
    const { data } = await supabase
      .from('communities')
      .select('company')
      .neq('company', '')
      .order('company');
    
    if (data) {
      const unique = Array.from(new Set(data.map(r => r.company))).sort();
      setCompanies(unique);
    }
  }, []);

  const fetchCommunities = useCallback(async (reset = false) => {
    setLoading(true);
    const start = reset ? 0 : from;

    let q = supabase
      .from('communities')
      .select('id, name, company, total_monthly_price, total_annual_price, status', { count: 'exact' });

    if (query.trim()) {
      // Search across Name OR Company OR Status
      q = q.or(`name.ilike.%${query}%,company.ilike.%${query}%`);
    }
    
    if (company) {
      q = q.eq('company', company);
    }

    // Default sorting and pagination
    q = q.order('name').range(start, start + PAGE - 1);

    const { data, count } = await q;
    
    if (reset) {
      setCommunities(data || []);
      setFrom(PAGE);
    } else {
      setCommunities(prev => [...prev, ...(data || [])]);
      setFrom(prev => prev + PAGE);
    }
    
    setTotal(count || 0);
    setLoading(false);
  }, [query, company, from]);

  // Handle initialization and filtered changes
  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  useEffect(() => {
    setIsPowerUser(document.cookie.includes('tgs_role=power_user'));
  }, []);

  const handleMerge = async () => {
    if (!primaryId || selected.length < 2) return;
    setMerging(true);
    try {
      const duplicates = selected.filter(id => id !== primaryId);
      
      for (const dup of duplicates) {
        const dupCommunity = communities.find(c => c.id === dup);
        const action = mergeMap[dup] || 'zone';
        
        const { error } = await supabase.rpc('merge_community_records', {
          p_target_id: primaryId,
          p_source_id: dup,
          p_map_action: action,
          p_source_name: dupCommunity?.name || ''
        });

        if (error) {
          console.error(error);
          throw new Error('Failed executing RPC: ' + error.message);
        }
      }
      
      alert('Merged successfully.');
      setShowMergeModal(false);
      setSelected([]);
      setPrimaryId('');
      setMergeMap({});
      fetchCommunities(true);
    } catch (err) {
      console.error(err);
      alert('Failed to merge communities. Please check console for errors.');
    } finally {
      setMerging(false);
    }
  };
  
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunities(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, company]); // We trigger reset only when core search inputs change

  return (
    <div style={{ padding: '40px 48px' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
          Portfolio
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Community Portfolio</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
          {total.toLocaleString()} communities across your portfolio
        </p>
      </div>

      {/* Filters */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMergeModal(false)} />
          <div className="relative z-[10000] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg p-8 fade-up">
            <h2 className="text-xl font-extrabold mb-4 text-zinc-900 dark:text-white">Merge Communities</h2>
            <p className="text-sm text-zinc-500 mb-6">Select the primary community to keep. The others will be deleted and their service history will be re-assigned to the primary community.</p>
            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto mb-4 p-1">
              {selected.map(id => {
                const c = communities.find(comm => comm.id === id);
                const isPrimary = primaryId === id;
                const mapping = mergeMap[id] || 'zone';
                
                return (
                  <div key={id} className={`flex flex-col gap-2 p-3 rounded-lg border transition-colors ${isPrimary ? 'border-zinc-700 bg-zinc-900/5' : 'border-zinc-700'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="primary" checked={isPrimary} onChange={() => setPrimaryId(id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-100">{c?.name}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{c?.company || 'No Company'}</div>
                      </div>
                      {isPrimary && <span className="text-[10px] font-bold text-zinc-300 bg-zinc-700 px-2 py-1 rounded-sm tracking-wider">MASTER RECORD</span>}
                    </label>

                    {!isPrimary && primaryId && (
                      <div className="pl-6 pt-2 pb-1 border-t border-zinc-800 mt-1">
                        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Map Old Text To:</div>
                        <div className="flex flex-wrap gap-2">
                          {(['area', 'zone', 'notes', 'discard'] as const).map(action => (
                            <label key={action} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer border ${mapping === action ? 'bg-zinc-800 border-zinc-500 text-zinc-100' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                              <input 
                                type="radio" 
                                className="hidden" 
                                checked={mapping === action}
                                onChange={() => setMergeMap(prev => ({ ...prev, [id]: action }))}
                              />
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button className="btn btn-ghost" onClick={() => setShowMergeModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!primaryId || merging} onClick={handleMerge}>
                {merging ? 'Merging...' : 'Confirm Merge'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fade-up fade-up-1" style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search communities..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Company filter */}
        <div style={{ position: 'relative' }}>
          <select
            className="input"
            style={{ paddingRight: 32, appearance: 'none', cursor: 'pointer', minWidth: 180 }}
            value={company}
            onChange={e => setCompany(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {(query || company) && (
          <button className="btn btn-ghost" onClick={() => { setQuery(''); setCompany(''); }}>
            <X size={13} /> Clear
          </button>
        )}

        {isPowerUser && selected.length > 1 && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowMergeModal(true)}>
            <Combine size={14} /> Merge Selected ({selected.length})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="fade-up fade-up-2 card" style={{ overflow: 'hidden' }}>
        <table className="tgs-table">
          <thead>
            <tr>
              {isPowerUser && <th style={{ width: 40 }}><CheckSquare size={14} color="var(--text-muted)" /></th>}
              <th>Community</th>
              <th>Company</th>
              <th style={{ textAlign: 'right' }}>Monthly</th>
              <th style={{ textAlign: 'right' }}>Annual</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && communities.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6}>
                    <div className="skeleton" style={{ height: 18, borderRadius: 6 }} />
                  </td>
                </tr>
              ))
            ) : (
              communities.map((c) => (
                <tr key={c.id}>
                  {isPowerUser && (
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selected.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelected([...selected, c.id]);
                          else setSelected(selected.filter(id => id !== c.id));
                        }}
                      />
                    </td>
                  )}
                  <td>
                    <button 
                      onClick={() => setSelectedCommunityId(c.id)}
                      className="group/name flex items-center gap-2 hover:text-zinc-600 transition-colors"
                      style={{ fontWeight: 600, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                    >
                      <Building2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="group-hover/name:underline underline-offset-2">{c.name}</span>
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.company || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>
                    {c.total_monthly_price !== null && c.total_monthly_price !== undefined
                      ? `$${parseFloat(c.total_monthly_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : <span style={{ color: 'var(--text-subtle)' }}>—</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                    {c.total_annual_price !== null && c.total_annual_price !== undefined
                      ? `$${parseFloat(c.total_annual_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      : '—'
                    }
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'Active' ? 'badge-green' : 'badge-neutral'}`}>
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <Link href={`/communities/${c.id}`} style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}
                      className="btn btn-ghost" >
                      View <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Load more */}
        {communities.length < total && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <button className="btn btn-ghost" onClick={() => fetchCommunities(false)} disabled={loading}>
              {loading ? 'Loading...' : `Load more (${total - communities.length} remaining)`}
            </button>
          </div>
        )}
      </div>

      <CommunityDrawer 
        communityId={selectedCommunityId} 
        onClose={() => setSelectedCommunityId(null)} 
      />
    </div>
  );
}
