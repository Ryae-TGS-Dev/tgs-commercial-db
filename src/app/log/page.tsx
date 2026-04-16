'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Search,
  ChevronDown,
  Leaf,
  Minus,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  PenLine,
  Activity,
} from 'lucide-react';

// Dynamically fetched below

function BagCounter({ sku, label, price, value, onChange }: any) {
  const total = value * price;
  return (
    <div className="card" style={{ padding: '12px 16px', background: value > 0 ? 'var(--bg)' : 'var(--surface-2)', border: value > 0 ? '1px solid var(--accent-border)' : '1px solid var(--border)', transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: value > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontWeight: 600 }}>${price.toFixed(2)} / unit</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '2px', height: 40 }}>
            <button
              type="button"
              onClick={() => onChange(Math.max(0, value - 1))}
              style={{ width: 34, height: 34, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            >
              <Minus size={14} />
            </button>

            <input
              type="number"
              min={0}
              value={value || ''}
              placeholder="0"
              onChange={e => onChange(parseInt(e.target.value) || 0)}
              style={{ width: 50, textAlign: 'center', fontWeight: 800, fontSize: 16, background: 'none', border: 'none', color: value > 0 ? 'var(--accent)' : 'var(--text-muted)', outline: 'none' }}
            />

            <button
              type="button"
              onClick={() => onChange(value + 1)}
              style={{ width: 34, height: 34, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Pallet shortcut */}
          <button
            type="button"
            onClick={() => onChange(value + 40)}
            style={{ height: 40, px: '12px', borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 64 }}
            title="Add 1 pallet (40 bags)"
          >
            +PLT
          </button>
        </div>
      </div>
      
      {value > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Cost</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      )}
    </div>
  );
}

function LogForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Community
  const [communitySearch, setCommunitySearch] = useState(searchParams.get('community') || '');
  const [communityId, setCommunityId] = useState(searchParams.get('id') || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [noMatchFound, setNoMatchFound] = useState(false);
  const [isNewCommunity, setIsNewCommunity] = useState(false);
  const [newCommunityCompany, setNewCommunityCompany] = useState('');

  // Service details
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [servicePerformed, setServicePerformed] = useState('');

  // Crew with autocomplete
  const [crewLeader, setCrewLeader] = useState('');
  const [showLeaderSuggestions, setShowLeaderSuggestions] = useState(false);
  const [crewMembers, setCrewMembers] = useState<string[]>([]);
  const [memberInput, setMemberInput] = useState('');
  const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);
  const [knownLeaders, setKnownLeaders] = useState<string[]>([]);
  const [knownMembers, setKnownMembers] = useState<string[]>([]);
  const [crewCount, setCrewCount] = useState('');

  // Hours
  const [hoursInput, setHoursInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');

  // Service flags
  const [isSpecial, setIsSpecial] = useState(false);
  const [isOneTime, setIsOneTime] = useState(false);
  const [serviceCategory, setServiceCategory] = useState('Contract Maintenance');
  const [bags, setBags] = useState<Record<string, number>>({});
  const [uiGuidelines, setUiGuidelines] = useState({
    service: "Standard: Fertilized [Area] with [Product]. Sprayed [Target]...",
    crew: "Standard format: First Last"
  });

  const [products, setProducts] = useState<any[]>([]);
  const [laborRate, setLaborRate] = useState(32.50);
  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);

  // Load distinct crew names, guidelines, and products
  useEffect(() => {
    const loadData = async () => {
      const [{ data: crewData }, { data: settingsData }, { data: productData }] = await Promise.all([
        supabase.from('crew_leaders').select('name').order('name'),
        supabase.from('app_settings').select('key, value').in('key', ['guideline_service_performed', 'guideline_crew_name', 'labor_rate_per_hour']),
        supabase.from('products').select('*').order('sku')
      ]);

      if (settingsData) {
        const map = Object.fromEntries(settingsData.map((s: any) => [s.key, s.value]));
        setUiGuidelines({
          service: map['guideline_service_performed'] || uiGuidelines.service,
          crew: map['guideline_crew_name'] || uiGuidelines.crew
        });
        if (map['labor_rate_per_hour']) {
          setLaborRate(parseFloat(map['labor_rate_per_hour']));
        }
      }

      if (crewData) {
        setKnownLeaders(crewData.map(c => c.name).sort());
      }

      if (productData) {
        setProducts(productData);
      }
      
      const { data: hist } = await supabase.from('service_history').select('crew_leader, crew_members').order('service_date', { ascending: false }).limit(200);
      const members = new Set<string>();
      const leadersFromHist = new Set<string>();
      
      hist?.forEach(r => {
        if (r.crew_leader) leadersFromHist.add(r.crew_leader.trim());
        if (r.crew_members) r.crew_members.split(',').forEach((m: string) => members.add(m.trim()));
      });
      
      setKnownLeaders(prev => Array.from(new Set([...prev, ...leadersFromHist])).sort());
      setKnownMembers(Array.from(members).sort());
    };
    loadData();
  }, []);

  // Community autocomplete
  useEffect(() => {
    if (isNewCommunity) return;
    if (communitySearch.length < 2) { setSuggestions([]); setNoMatchFound(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('communities')
        .select('id, name, company')
        .ilike('name', `%${communitySearch}%`)
        .limit(6);
      setSuggestions(data || []);
      setNoMatchFound((data || []).length === 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [communitySearch, isNewCommunity]);

  const totalMaterialCost = Object.entries(bags).reduce((sum, [id, qty]) => {
    const product = products.find(p => p.id === id);
    return sum + qty * (parseFloat(product?.unit_price) || 0);
  }, 0);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate_warning'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isNewCommunity && !communityId) { setErrorMsg('Please select a community from the list.'); return; }
    if (isNewCommunity && !communitySearch.trim()) { setErrorMsg('Please enter the new community name.'); return; }
    if (!servicePerformed) { setErrorMsg('Please describe the service performed.'); return; }

    if (status !== 'duplicate_warning') {
      const { data: existing } = await supabase
        .from('service_history')
        .select('id')
        .eq('community_id', communityId)
        .eq('service_date', serviceDate)
        .limit(1);
      
      if (existing && existing.length > 0) {
        setStatus('duplicate_warning');
        return;
      }
    }

    setStatus('loading');
    setErrorMsg('');

    const hrs = parseInt(hoursInput) || 0;
    const mins = parseInt(minutesInput) || 0;
    if (hrs === 0 && mins === 0) {
      setErrorMsg('Please enter the hours and/or minutes spent on this visit.');
      setStatus('idle');
      return;
    }
    if (mins < 0 || mins > 59) {
      setErrorMsg('Minutes must be between 0 and 59.');
      setStatus('idle');
      return;
    }

    const laborHoursLabel = [
      hrs > 0 ? `${hrs} hr${hrs !== 1 ? 's' : ''}` : null,
      mins > 0 ? `${mins} min${mins !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' ');
    const totalLaborHoursNum = hrs + mins / 60;

    // Create new community if needed
    let finalCommunityId = communityId;
    if (isNewCommunity) {
      const { data: newComm, error: commErr } = await supabase
        .from('communities')
        .insert({ name: communitySearch.trim(), company: newCommunityCompany.trim() || null })
        .select('id')
        .single();
      if (commErr || !newComm) {
        setStatus('error');
        setErrorMsg('Failed to create new community: ' + (commErr?.message || 'Unknown error'));
        return;
      }
      finalCommunityId = newComm.id;
    }

    const allCrew = [crewLeader, ...crewMembers].filter(Boolean);
    
    // Register new crew leader if necessary
    if (crewLeader) {
      await supabase.from('crew_leaders').upsert({ name: crewLeader, is_active: true }, { onConflict: 'name' });
    }

    // Fetch current community price to snapshot
    let currentContractPrice = 0;
    if (!isNewCommunity && finalCommunityId) {
      const { data: comm } = await supabase.from('communities').select('total_monthly_price').eq('id', finalCommunityId).single();
      currentContractPrice = comm?.total_monthly_price || 0;
    }

    const serviceEntry = {
      community_id: finalCommunityId,
      source_community_name: communitySearch,
      service_date: serviceDate,
      service_performed: servicePerformed,
      crew_leader: crewLeader.trim(),
      crew_members: crewMembers.join(', '),
      crew_count: parseInt(crewCount) || (crewLeader ? 1 : 0) + crewMembers.length || 0,
      labor_hours: laborHoursLabel,
      total_labor_hours_num: totalLaborHoursNum,
      is_special_service: isSpecial,
      is_one_time_service: isOneTime,
      service_category: isSpecial
        ? serviceCategory
        : isOneTime
          ? 'One Time Service'
          : 'Contract Maintenance',
      total_lawn_material_cost: totalMaterialCost,
      // FORENSIC SNAPSHOTS
      applied_labor_rate: laborRate,
      applied_contract_value: currentContractPrice
    };

    const { data: inserted, error } = await supabase
      .from('service_history')
      .insert(serviceEntry)
      .select()
      .single();

    if (error || !inserted) {
      setStatus('error');
      setErrorMsg(error?.message || 'Failed to save service log.');
      return;
    }

    const usageRows = Object.entries(bags)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = products.find(p => p.id === id);
        return {
          service_id: inserted.id,
          product_id: id,
          quantity_used: qty,
          applied_unit_price: parseFloat(product?.unit_price) || 0 // Snapshot material price
        };
      });

    if (usageRows.length > 0) {
      await supabase.from('service_product_usage').insert(usageRows);
    }

    setStatus('success');
    setTimeout(() => router.push(`/communities/${finalCommunityId}`), 1800);
  };

  if (status === 'success') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <CheckCircle2 size={48} color="var(--accent)" />
        <div style={{ fontSize: 20, fontWeight: 800 }}>Service Logged!</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Redirecting to community page...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Community Search */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Community *
              </label>
              <button
                type="button"
                onClick={() => { setIsNewCommunity(p => !p); setCommunityId(''); setSuggestions([]); setNoMatchFound(false); }}
                style={{ fontSize: 11, fontWeight: 600, color: isNewCommunity ? 'var(--accent)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                {isNewCommunity ? '← Search existing' : '+ New community'}
              </button>
            </div>

            {isNewCommunity ? (
              // New community form
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Community name *"
                  value={communitySearch}
                  onChange={e => setCommunitySearch(e.target.value)}
                  style={{ fontWeight: 600 }}
                />
                <input
                  className="input"
                  placeholder="Company"
                  value={newCommunityCompany}
                  onChange={e => setNewCommunityCompany(e.target.value)}
                />
                <div style={{ fontSize: 11, color: 'var(--accent)', padding: '2px 0' }}>
                  A new community record will be created on submit.
                </div>
              </div>
            ) : (
              // Existing community search
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search community name... (minimum 2 chars)"
                  value={communitySearch}
                  onChange={e => { setCommunitySearch(e.target.value); setCommunityId(''); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 4 }}>
                  Ensure you select the exact community from the dropdown to link your records correctly.
                </div>
                {communityId && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}><CheckCircle2 size={14} color="var(--accent)" /></div>}
                {showSuggestions && (suggestions.length > 0 || noMatchFound) && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden' }}>
                    {suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={() => { setCommunitySearch(s.name); setCommunityId(s.id); setShowSuggestions(false); }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.company || 'Company'}</div>
                      </button>
                    ))}
                    {noMatchFound && communitySearch.length >= 2 && (
                      <button
                        type="button"
                        onMouseDown={() => { setIsNewCommunity(true); setShowSuggestions(false); }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'var(--accent-dim)', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}
                      >
                        + Add &ldquo;{communitySearch}&rdquo; as a new community
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Service Date *
            </label>
            <input type="date" className="input" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
          </div>

          {/* Service Performed */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Service Performed *
            </label>
            <textarea
              className="input"
              rows={4}
              style={{ resize: 'vertical' }}
              placeholder={uiGuidelines.service}
              value={servicePerformed}
              onChange={e => setServicePerformed(e.target.value)}
            />
            <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 4 }}>
              Be specific about areas treated and materials used.
            </div>
          </div>

          {/* Crew Builder */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Crew
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Crew Leader with autocomplete */}
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  placeholder={uiGuidelines.crew}
                  value={crewLeader}
                  onChange={e => { setCrewLeader(e.target.value); setShowLeaderSuggestions(true); }}
                  onFocus={() => setShowLeaderSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLeaderSuggestions(false), 200)}
                  style={{ paddingLeft: 44, fontWeight: 600 }}
                />
                <div style={{ position: 'absolute', left: 12, top: '12px', height: '18px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.04em', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', padding: '1px 5px', borderRadius: 4, lineHeight: 1 }}>LDR</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 4 }}>
                  Start typing to see previous crew leaders.
                </div>
                {showLeaderSuggestions && crewLeader.length >= 1 && (() => {
                  const matches = knownLeaders.filter(l => l.toLowerCase().includes(crewLeader.toLowerCase())).slice(0, 6);
                  const exactMatch = knownLeaders.some(l => l.toLowerCase() === crewLeader.toLowerCase());
                  
                  return (matches.length > 0 || (!exactMatch && crewLeader.trim())) ? (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {matches.map(m => (
                        <button key={m} type="button" onMouseDown={() => { setCrewLeader(m); setShowLeaderSuggestions(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
                          <Users size={12} color="var(--text-subtle)" />
                          {m}
                        </button>
                      ))}
                      {!exactMatch && crewLeader.trim() && (
                        <button 
                          type="button" 
                          onMouseDown={() => { setShowLeaderSuggestions(false); }} 
                          style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'rgba(22, 163, 74, 0.05)', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}
                        >
                          + Use "{crewLeader}" as new leader
                        </button>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Add crew members with autocomplete */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder={uiGuidelines.crew}
                    value={memberInput}
                    onChange={e => { setMemberInput(e.target.value); setShowMemberSuggestions(true); }}
                    onFocus={() => setShowMemberSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowMemberSuggestions(false), 200)}
                    onKeyDown={e => {
                      if ((e.key === 'Enter' || e.key === ',') && memberInput.trim()) {
                        e.preventDefault();
                        const name = memberInput.trim().replace(/,$/, '');
                        if (name && !crewMembers.includes(name)) {
                          setCrewMembers(prev => [...prev, name]);
                          setCrewCount(String((crewLeader ? 1 : 0) + crewMembers.length + 1));
                        }
                        setMemberInput('');
                        setShowMemberSuggestions(false);
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  {showMemberSuggestions && memberInput.length >= 1 && (() => {
                    const matches = knownMembers
                      .filter(m => m.toLowerCase().includes(memberInput.toLowerCase()) && !crewMembers.includes(m) && m !== crewLeader)
                      .slice(0, 6);
                    const exactMatch = knownMembers.some(m => m.toLowerCase() === memberInput.toLowerCase());

                    return (matches.length > 0 || (!exactMatch && memberInput.trim())) ? (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        {matches.map(m => (
                          <button key={m} type="button" onMouseDown={() => { setCrewMembers(prev => [...prev, m]); setMemberInput(''); setShowMemberSuggestions(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text)' }}>
                            <Users size={12} color="var(--text-subtle)" />
                            {m}
                          </button>
                        ))}
                        {!exactMatch && memberInput.trim() && (
                          <button 
                            type="button" 
                            onMouseDown={() => { setCrewMembers(prev => [...prev, memberInput]); setMemberInput(''); setShowMemberSuggestions(false); }} 
                            style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'rgba(22, 163, 74, 0.05)', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}
                          >
                            + Add "{memberInput}" as new member
                          </button>
                        )}
                      </div>
                    ) : null;
                  })()}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flexShrink: 0, fontSize: 12, padding: '0 14px' }}
                    onClick={() => {
                      const name = memberInput.trim();
                      if (name && !crewMembers.includes(name)) {
                        setCrewMembers(prev => [...prev, name]);
                        setCrewCount(String((crewLeader ? 1 : 0) + crewMembers.length + 1));
                      }
                      setMemberInput('');
                      setShowMemberSuggestions(false);
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Member tags */}
              {crewMembers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {crewMembers.map((m, i) => (
                    <span
                      key={i}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 10px', fontSize: 12, fontWeight: 500 }}
                    >
                      {m}
                      <button
                        type="button"
                        onClick={() => {
                          setCrewMembers(prev => prev.filter((_, idx) => idx !== i));
                          setCrewCount(String((crewLeader ? 1 : 0) + crewMembers.length - 1));
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: '0 0 0 2px', fontSize: 13 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Crew summary */}
              {(crewLeader || crewMembers.length > 0) && (
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', padding: '4px 0' }}>
                  Will save as: <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    {[crewLeader, ...crewMembers].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Crew size + Hours row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                Crew Size
              </label>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="# of people"
                value={crewCount}
                onChange={e => setCrewCount(e.target.value)}
              />
              {crewMembers.length > 0 && !crewCount && (
                <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 4 }}>
                  Auto: {(crewLeader ? 1 : 0) + crewMembers.length} people
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                Time Spent <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Hours */}
                <div style={{ flex: 1 }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={24}
                      placeholder="0"
                      value={hoursInput}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 24)) setHoursInput(v);
                      }}
                      style={{ paddingRight: 36, textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 600 }}>hrs</span>
                  </div>
                </div>
                <span style={{ color: 'var(--text-subtle)', fontSize: 16, fontWeight: 300, flexShrink: 0 }}>:</span>
                {/* Minutes */}
                <div style={{ flex: 1 }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={59}
                      placeholder="00"
                      value={minutesInput}
                      onChange={e => {
                        const v = e.target.value;
                        // Allow empty or valid 0-59 range
                        if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 59)) setMinutesInput(v);
                      }}
                      style={{ paddingRight: 44, textAlign: 'right' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none', fontWeight: 600 }}>mins</span>
                  </div>
                </div>
              </div>
              {/* Live preview */}
              {(hoursInput || minutesInput) && (
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6 }}>
                  {(() => {
                    const h = parseInt(hoursInput) || 0;
                    const m = parseInt(minutesInput) || 0;
                    const dec = h + m / 60;
                    const label = [
                      h > 0 ? `${h} hr${h !== 1 ? 's' : ''}` : null,
                      m > 0 ? `${m} min${m !== 1 ? 's' : ''}` : null,
                    ].filter(Boolean).join(' ');
                    return label
                      ? <>{label} <span style={{ color: 'var(--text-subtle)' }}>({dec.toFixed(2)} hrs for cost calc)</span></>
                      : null;
                  })()}
                </div>
              )}
            </div>
          </div>


          {/* Service Category Selection */}
          <div style={{ padding: '20px 24px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 12 }}>
              Service Category
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Contract Maintenance', 'Special Service', 'One Time Service'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setServiceCategory(cat);
                    setIsSpecial(cat === 'Special Service');
                    setIsOneTime(cat === 'One Time Service');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: (serviceCategory === cat || (cat === 'Contract Maintenance' && !isSpecial && !isOneTime)) ? 'var(--accent)' : 'white',
                    color: (serviceCategory === cat || (cat === 'Contract Maintenance' && !isSpecial && !isOneTime)) ? 'white' : 'var(--text-muted)',
                    border: `1px solid ${(serviceCategory === cat || (cat === 'Contract Maintenance' && !isSpecial && !isOneTime)) ? 'var(--accent)' : 'var(--border)'}`
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            {isSpecial && (
              <div style={{ marginTop: 12 }}>
                <input className="input" placeholder="Service category (e.g. Storm cleanup)" value={serviceCategory} onChange={e => setServiceCategory(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column – Product Bags */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 12 }}>
            Materials Used
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Material Picker */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)', zIndex: 1 }} />
              <input 
                className="input" 
                style={{ paddingLeft: 36, fontSize: 13 }}
                placeholder="Search to add material..." 
                value={materialSearch}
                onChange={e => { setMaterialSearch(e.target.value); setShowMaterialSuggestions(true); }}
                onFocus={() => setShowMaterialSuggestions(true)}
                onBlur={() => setTimeout(() => setShowMaterialSuggestions(false), 200)}
              />
              {showMaterialSuggestions && materialSearch.length >= 1 && (() => {
                const matches = products.filter(p => 
                  !bags[p.id] && 
                  (p.sku.toLowerCase().includes(materialSearch.toLowerCase()) || 
                   p.category?.toLowerCase().includes(materialSearch.toLowerCase()))
                ).slice(0, 8);

                return matches.length > 0 ? (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 4, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {matches.map(p => (
                      <button key={p.id} type="button" 
                        onMouseDown={() => { 
                          setBags(prev => ({ ...prev, [p.id]: 0 })); 
                          setMaterialSearch(''); 
                          setShowMaterialSuggestions(false); 
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.sku}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.category || 'Uncategorized'}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>${parseFloat(p.unit_price).toFixed(2)}/unit</div>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Selection divider */}
            {Object.keys(bags).length > 0 && (
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
            )}

            {/* Selected Materials List */}
            {Object.entries(bags).map(([id, qty]) => {
              const p = products.find(prod => prod.id === id);
              if (!p) return null;
              return (
                <div key={id} style={{ position: 'relative' }}>
                  <BagCounter
                    sku={p.sku}
                    label={p.sku}
                    price={parseFloat(p.unit_price) || 0}
                    value={qty}
                    onChange={(v: number) => setBags(prev => ({ ...prev, [id]: v }))}
                  />
                  {qty === 0 && (
                     <button 
                       type="button"
                       onClick={() => setBags(prev => {
                         const next = { ...prev };
                         delete next[id];
                         return next;
                       })}
                       style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'var(--surface-2)', width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}
                     >
                       ×
                     </button>
                  )}
                </div>
              );
            })}

            {Object.keys(bags).length === 0 && (
              <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg)', borderRadius: 12, border: '2px dashed var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>No materials selected</div>
                <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>Search for products above to add them to your log</div>
              </div>
            )}
          </div>
          </div>

          {/* Material Cost Summary */}
          {totalMaterialCost > 0 && (
            <div className="card" style={{ padding: 16, marginTop: 12, background: 'var(--accent-dim)', borderColor: 'var(--accent-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Total Material Cost</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>
                  ${totalMaterialCost.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Warning */}
      {status === 'duplicate_warning' && (
        <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={20} color="#f59e0b" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Duplicate Entry Detected</div>
            <div style={{ fontSize: 13, color: '#92400e', marginTop: 2 }}>
              A service log already exists for this community on this date. Are you sure you want to add another?
            </div>
          </div>
          <button 
            type="button" 
            className="btn" 
            style={{ background: '#f59e0b', color: 'white' }}
            onClick={() => handleSubmit()}
          >
            Submit Anyway
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13 }}>
          <AlertCircle size={14} /> {errorMsg}
        </div>
      )}

      {/* Submit */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button type="submit" className="btn btn-primary" disabled={status === 'loading' || status === 'duplicate_warning'} style={{ padding: '12px 28px', fontSize: 14 }}>
          {status === 'loading' ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Leaf size={14} /> Save Service Log</>}
        </button>
      </div>
    </form>
  );
}

function AccessDenied() {
  const router = useRouter();
  return (
    <div style={{ padding: '40px 48px', maxWidth: 600, margin: '0 auto', textAlign: 'center', paddingTop: 100 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <AlertCircle size={28} color="#f59e0b" />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Executive View — Read Only</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
        Logging service visits requires Power User Mode. Switch your access level in Settings to enable field entry.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => router.push('/settings')} className="btn btn-primary">Go to Settings</button>
        <button onClick={() => router.back()} className="btn btn-ghost">Go Back</button>
      </div>
    </div>
  );
}

export default function LogPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      // 1. Check for legacy cookie
      const isPowerUser = document.cookie.includes('tgs_role=power_user');
      if (isPowerUser) {
        setHasAccess(true);
        return;
      }

      // 2. Fallback: Check actual Supabase session (Admin bypass)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === 'tgssales.ryae@gmail.com') {
        setHasAccess(true);
        return;
      }

      setHasAccess(false);
    };

    checkAccess();
  }, []);

  // Loading state — avoid flash of form before access is verified
  if (hasAccess === null) return null;

  if (!hasAccess) return <AccessDenied />;

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header - Unified Styling */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
           <div style={{ background: '#18181b', padding: 8, borderRadius: 10, color: 'white' }}>
             <Activity size={18} />
           </div>
           <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Record Service</h1>
        </div>
        <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14, fontWeight: 500 }}>
          Record today's field work. Product counts auto-calculate material costs.
        </p>
      </div>

      <div className="fade-up fade-up-1 card" style={{ padding: 32 }}>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
            <Loader2 className="animate-spin" size={24} color="var(--accent)" />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Preparing Field Log</div>
          </div>
        }>
          <LogForm />
        </Suspense>
      </div>
    </div>
  );
}

