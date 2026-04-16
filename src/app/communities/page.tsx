'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Building2, ArrowRight, X, ChevronDown, CheckSquare, Combine, Target, Maximize } from 'lucide-react';
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
      .select('id, name, company, total_monthly_price, total_annual_price, square_footage, status', { count: 'exact' });

    if (query.trim()) {
      q = q.or(`name.ilike.%${query}%,company.ilike.%${query}%`);
    }
    
    if (company) {
      q = q.eq('company', company);
    }

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
        const { error } = await supabase.rpc('merge_community_records', {
          p_target_id: primaryId,
          p_source_id: dup,
          p_map_action: mergeMap[dup] || 'zone',
          p_source_name: communities.find(c => c.id === dup)?.name || ''
        });
        if (error) throw error;
      }
      setShowMergeModal(false);
      setSelected([]);
      fetchCommunities(true);
    } catch (err) {
      console.error(err);
      alert('Merge failed.');
    } finally {
      setMerging(false);
    }
  };
  
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCommunities(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, company]);

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header - Unified Site Styling */}
      <div className="fade-up" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ background: '#18181b', padding: 8, borderRadius: 10, color: 'white' }}>
               <Building2 size={18} />
             </div>
             <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Community Portfolio</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14, fontWeight: 500 }}>
            Tracking <span style={{ color: '#18181b', fontWeight: 800 }}>{total.toLocaleString()}</span> active community profiles and service footprints.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
          <Search size={14} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 44, borderRadius: 16, height: 48 }}
            placeholder="Search by community name or company..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <select
            className="input"
            style={{ paddingLeft: 16, paddingRight: 40, appearance: 'none', cursor: 'pointer', minWidth: 200, borderRadius: 16, height: 48 }}
            value={company}
            onChange={e => setCompany(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {isPowerUser && selected.length > 1 && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto', height: 48, borderRadius: 16, padding: '0 24px' }} onClick={() => setShowMergeModal(true)}>
            <Combine size={14} /> Merge Selected ({selected.length})
          </button>
        )}
      </div>

      {/* Table - Optimized for perfect alignment and consistency */}
      <div className="fade-up fade-up-2 card" style={{ overflow: 'hidden', borderRadius: 24, border: '1px solid #f1f5f9' }}>
        <table className="tgs-table">
          <thead>
            <tr style={{ background: '#fafafa' }}>
              {isPowerUser && <th style={{ width: 40, padding: '16px 24px' }}><CheckSquare size={14} color="var(--text-muted)" /></th>}
              <th style={{ padding: '16px 24px' }}>Community</th>
              <th>Company</th>
              <th style={{ textAlign: 'right' }}>Community Area</th>
              <th style={{ textAlign: 'center' }}>Efficiency</th>
              <th style={{ textAlign: 'right' }}>Monthly Contract</th>
              <th style={{ textAlign: 'right' }}>Annual Contract</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!loading || communities.length > 0 ? (
              communities.map((c) => (
                <tr key={c.id}>
                  {isPowerUser && (
                    <td style={{ padding: '16px 24px', verticalAlign: 'center' }}>
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
                  <td style={{ verticalAlign: 'middle', padding: '16px 24px' }}>
                    <button 
                      onClick={() => setSelectedCommunityId(c.id)}
                      className="group/name flex flex-col gap-0.5"
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                    >
                      <span className="font-extrabold text-[#18181b] text-[14px] group-hover/name:underline underline-offset-2 leading-tight">{c.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' }}>{c.id.substring(0,8)}</span>
                    </button>
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <div style={{ color: '#4b5563', fontSize: 13, fontWeight: 600 }}>{c.company || '—'}</div>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontWeight: 800, color: '#18181b', fontFamily: 'monospace', fontSize: 14 }}>{(c.square_footage || 0).toLocaleString()}</span>
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#a1a1aa', textTransform: 'uppercase' }}>SQFT</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                     <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: c.status !== 'Active' ? '#f8fafc' : (!c.square_footage || c.square_footage === 0) ? '#fffbeb' : '#f0fdf4', padding: '4px 10px', borderRadius: 20, border: '1px solid currentColor', borderOpacity: 0.1 }}>
                        <div style={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          background: c.status !== 'Active' ? '#cbd5e1' : (!c.square_footage || c.square_footage === 0) ? '#f59e0b' : '#10b981' 
                        }} />
                        <span style={{ 
                          fontSize: 11, 
                          fontWeight: 800, 
                          color: c.status !== 'Active' ? '#64748b' : (!c.square_footage || c.square_footage === 0) ? '#d97706' : '#10b981' 
                        }}>
                          {c.status !== 'Active' ? 'Unmapped' : (!c.square_footage || c.square_footage === 0) ? 'Awaiting Metrics' : 'Optimized'}
                        </span>
                     </div>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, color: '#18181b', fontSize: 14 }}>
                    {c.total_monthly_price !== null 
                      ? `$${parseFloat(c.total_monthly_price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                      : '—'
                    }
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, color: '#18181b', fontSize: 14 }}>
                    {c.total_annual_price !== null 
                      ? `$${parseFloat(c.total_annual_price).toLocaleString('en-US', { minimumFractionDigits: 0 })}`
                      : '—'
                    }
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span className={`badge ${c.status === 'Active' ? 'badge-green' : 'badge-neutral'}`} style={{ fontWeight: 800, fontSize: 10 }}>
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ paddingRight: 24, verticalAlign: 'middle' }}>
                    <Link href={`/communities/${c.id}`} style={{ color: '#64748b' }} className="btn btn-ghost p-2">
                      <ArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={9}><div className="skeleton" style={{ height: 24, borderRadius: 8, margin: '12px 24px' }} /></td></tr>
              ))
            )}
          </tbody>
        </table>

        {communities.length < total && (
          <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <button className="btn btn-ghost" style={{ fontWeight: 800, color: '#71717a' }} onClick={() => fetchCommunities(false)} disabled={loading}>
              {loading ? 'Processing...' : `Show Next ${Math.min(PAGE, total - communities.length)} Records`}
            </button>
          </div>
        )}
      </div>

      <CommunityDrawer 
        communityId={selectedCommunityId} 
        onClose={() => setSelectedCommunityId(null)} 
        onUpdated={() => fetchCommunities(true)}
      />
    </div>
  );
}
