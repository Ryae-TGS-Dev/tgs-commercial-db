import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  CalendarDays,
  User,
  Package,
  Leaf,
  ClipboardList,
  Target,
  Maximize
} from 'lucide-react';
import { EditCommunityModal } from '@/components/EditCommunityModal';
import { EditLogModal } from '@/components/EditLogModal';
import { cookies } from 'next/headers';
import { CrewLeaderDisplay } from '@/components/CrewLeaderDisplay';
import { ServiceDisplay } from '@/components/ServiceDisplay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getCommunityData(id: string) {
  const [commRes, historyRes, settingsRes] = await Promise.all([
    supabase.from('communities').select('*').eq('id', id).single(),
    supabase
      .from('service_history')
      .select('*, crew_members')
      .eq('community_id', id)
      .order('service_date', { ascending: false })
      .limit(50),
    supabase.from('app_settings').select('key, value'),
  ]);

  const settingsMap = Object.fromEntries((settingsRes.data || []).map((s: any) => [s.key, s.value]));
  const laborRate = parseFloat(settingsMap['labor_rate_per_hour'] || '32.50');

  const history = historyRes.data || [];
  const historyIds = history.map(h => h.id);

  // Fetch materials and exact contract component mapping
  const [materialsRes, breakdownRes] = await Promise.all([
    historyIds.length > 0 
      ? supabase.from('service_product_usage').select('service_id, quantity_used, products(sku, unit_price)').in('service_id', historyIds)
      : Promise.resolve({ data: [] }),
    supabase.rpc('get_community_contract_breakdown', { p_id: id })
  ]);

  return {
    community: commRes.data,
    history,
    productUsage: materialsRes.data || [],
    contract: breakdownRes.data || {},
    laborRate,
  };
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get('tgs_role')?.value;
  const isPowerUser = role === 'power_user';

  const { community, history, productUsage, contract, laborRate } = await getCommunityData(id);
  if (!community) notFound();

  const historyWithMaterials = history.map((h: any) => {
    const materials = productUsage.filter((u: any) => u.service_id === h.id);
    return { ...h, materials };
  });

  // Unique tags across all active revenue components
  const allComponents = contract.components || [];
  const areas = [...new Set(allComponents.map((c: any) => c.area).filter(Boolean))];
  const zones = [...new Set(allComponents.map((c: any) => c.zone).filter(Boolean))];
  const tags = [...new Set([...areas, ...zones])];

  const splitCrew = (val: string) => val.split(/,|&|\band\b/i).map((s: string) => s.trim()).filter(Boolean);
  const leaders = [...new Set(
    history.map((h: any) => h.crew_leader ? splitCrew(h.crew_leader)[0] : null).filter(Boolean)
  )];

  const totalLaborCost = history.reduce((sum: number, h: any) => {
    const hrs = parseFloat(h.total_labor_hours_num || 0);
    const crew = parseInt(h.crew_count || 1);
    return sum + (hrs * crew * laborRate);
  }, 0);

  const totalMaterials = productUsage.reduce((sum: number, u: any) => {
    return sum + (u.quantity_used * (u.products?.unit_price || 0));
  }, 0);

  const totalCost = totalLaborCost + totalMaterials;

  const materialMap = new Map();
  productUsage.forEach((u: any) => {
    const sku = u.products?.sku || 'Unknown';
    const qty = u.quantity_used;
    const cost = qty * (u.products?.unit_price || 0);
    if (!materialMap.has(sku)) materialMap.set(sku, { sku, total_qty: 0, total_cost: 0 });
    const m = materialMap.get(sku);
    m.total_qty += qty;
    m.total_cost += cost;
  });
  
  const topMaterials = Array.from(materialMap.values()).sort((a, b) => b.total_qty - a.total_qty).slice(0, 10);

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Back */}
      <Link href="/communities" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>
        <ArrowLeft size={13} /> Back to Portfolio
      </Link>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ background: '#18181b', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Community Profile</div>
              {community.status === 'Active' && <div style={{ color: '#10b981', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> ACTIVE REVENUE STREAM</div>}
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, margin: 0, letterSpacing: '-0.04em' }}>{community.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>{community.company}</span>
              {tags.map((t: any) => (
                <span key={t} className="badge badge-neutral">{t}</span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {isPowerUser && <EditCommunityModal community={community} />}
            <Link href={`/log?community=${encodeURIComponent(community.name)}&id=${community.id}`}
              className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 16, fontWeight: 700 }}>
              <ClipboardList size={14} /> Record Service
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Stats Row - The "Community Portfolio Enhancement" */}
      <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard 
          icon={<Maximize size={16} />} 
          label="Community Area" 
          value={(community.square_footage || 0).toLocaleString()} 
          suffix="SQFT"
          color="zinc" 
        />
        <StatCard 
          icon={<Target size={16} />} 
          label="Application Efficiency" 
          value={community.status !== 'Active' ? 'Unmapped' : (!community.square_footage || community.square_footage === 0) ? 'Awaiting Metrics' : 'Optimized'} 
          color={community.status !== 'Active' ? 'zinc' : (!community.square_footage || community.square_footage === 0) ? 'amber' : 'green'} 
        />
        <StatCard 
          icon={<DollarSign size={16} />} 
          label="Monthly Performance Target" 
          value={`$${parseFloat(contract.total_monthly || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`} 
          color="amber" 
        />
        <StatCard 
          icon={<DollarSign size={16} />} 
          label="Projected Annual Yield" 
          value={`$${((parseFloat(contract.total_monthly || 0)) * 12).toLocaleString('en-US', { minimumFractionDigits: 0 })}`} 
          color="amber" 
        />
      </div>

      {/* Summary Cards Row */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>

        {/* Service Cost Breakdown */}
        <div className="card" style={{ padding: 24, borderRadius: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Package size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Operational Expenditure</span>
          </div>
          <CostRow label="Logged Materials" value={totalMaterials} />
          <CostRow label={`Labor overhead (${laborRate.toFixed(2)}/hr)`} value={totalLaborCost} />
          <div style={{ height: 1, background: 'var(--border)', margin: '16px 0', opacity: 0.5 }} />
          <CostRow label={`Total Direct Cost`} value={totalCost} bold />
          
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Contract Component Mapping</div>
            {allComponents.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', background: '#f8fafc', padding: 16, borderRadius: 16, textAlign: 'center', border: '1px dashed #e2e8f0' }}>No mapped components.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allComponents.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: '10px 16px', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                      {[c.area, c.zone].filter(Boolean).join(' • ') || 'Master Community'}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: '#18181b' }}>
                      ${parseFloat(c.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Usage */}
        <div className="card" style={{ padding: 24, borderRadius: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Leaf size={14} color="#10b981" />
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Product Consumption</span>
          </div>
          {topMaterials.length === 0 ? (
            <div style={{ color: 'var(--text-subtle)', fontSize: 12, background: '#f8fafc', padding: 16, borderRadius: 16, textAlign: 'center', border: '1px dashed #e2e8f0' }}>No product data logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topMaterials.map((m: any) => (
                <div key={m.sku}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{m.sku}</span>
                    <span style={{ fontSize: 12, color: '#18181b', fontFamily: 'monospace', fontWeight: 900 }}>{m.total_qty.toLocaleString()} units</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#18181b', borderRadius: 10, width: `${Math.min(100, (m.total_qty / (Math.max(...topMaterials.map((x:any)=>x.total_qty)) || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crew Leaders */}
        <div className="card" style={{ padding: 24, borderRadius: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <User size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Operational History</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Assigned Leadership</div>
              {leaders.length === 0 ? (
                <div style={{ color: 'var(--text-subtle)', fontSize: 12 }}>No crew data on record.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {leaders.map((l: any) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#18181b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 20, padding: '4px 12px 4px 6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#475569' }}>
                        {l.charAt(0).toUpperCase()}
                      </div>
                      {l}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop: 32, padding: 16, background: '#f8fafc', borderRadius: 20, border: '1px solid #e2e8f0' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                 <CalendarDays size={12} color="#64748b" />
                 <span style={{ fontSize: 12, fontWeight: 800 }}>{history.length}</span>
                 <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Total Service Events</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Width Service History Table */}
      <div className="fade-up fade-up-3 card" style={{ overflowX: 'auto', borderRadius: 32, border: '1px solid #f1f5f9' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: '#f1f5f9', padding: 8, borderRadius: 10 }}><ClipboardList size={16} color="#18181b" /></div>
          <div>
            <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-0.01em' }}>Detailed Service Audit</span>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 1 }}>Historical log of all maintenance forensics</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tgs-table" style={{ fontSize: 12, minWidth: 1240 }}>
            <thead>
              <tr style={{ background: '#fcfcfc' }}>
                <th style={{ minWidth: 100, whiteSpace: 'nowrap', padding: '16px 32px' }}>Date</th>
                <th style={{ minWidth: 150 }}>Location Details</th>
                <th style={{ minWidth: 280 }}>Service Performed</th>
                <th style={{ minWidth: 150 }}>Crew Leader</th>
                <th style={{ minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap' }}>Hours</th>
                <th style={{ minWidth: 60, textAlign: 'center' }}>Crew</th>
                <th style={{ minWidth: 180 }}>Materials Used</th>
                <th style={{ textAlign: 'right', minWidth: 120, whiteSpace: 'nowrap', paddingRight: 32 }}>Labor Cost</th>
                {isPowerUser && <th style={{ minWidth: 100, textAlign: 'right', whiteSpace: 'nowrap' }}></th>}
              </tr>
            </thead>
            <tbody>
              {historyWithMaterials.map((h: any) => {
                const hrs = parseFloat(h.total_labor_hours_num || 0);
                const crew = parseInt(h.crew_count || 1);
                const rowLaborCost = hrs * crew * laborRate;
                return (
                  <tr key={h.id}>
                    <td style={{ whiteSpace: 'nowrap', padding: '16px 32px' }}>
                      <span className="badge badge-neutral" style={{ padding: '4px 10px', fontWeight: 700 }}>
                        {new Date(h.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      {[h.area_name, h.zone_name].filter(Boolean).join(' — ') || 'Master Portfolio'}
                    </td>
                    <td>
                      <ServiceDisplay text={h.service_performed} />
                    </td>
                    <td>
                      <CrewLeaderDisplay name={h.crew_leader} crewMembers={h.crew_members} size="sm" />
                    </td>
                    <td style={{ color: '#18181b', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{hrs > 0 ? hrs.toFixed(2) : '0.00'}</td>
                    <td style={{ color: '#64748b', textAlign: 'center', fontWeight: 600 }}>{h.crew_count || '1'}</td>
                    <td>
                      {h.materials?.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {h.materials.map((m: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#18181b' }}>{m.products?.sku}</span>
                              <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>({m.quantity_used})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#18181b', fontWeight: 900, paddingRight: 32 }}>
                      ${rowLaborCost.toFixed(2)}
                    </td>
                    {isPowerUser && (
                      <td style={{ textAlign: 'right', paddingRight: 24 }}>
                        <EditLogModal log={h} />
                      </td>
                    )}
                  </tr>
                );
              })}
              {historyWithMaterials.length === 0 && (
                <tr><td colSpan={isPowerUser ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: 60 }}>No service history found for this community.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, suffix }: any) {
  const colors: any = {
    amber: { bg: '#fffbeb', text: '#d97706', border: '#fef3c7' },
    blue: { bg: '#eff6ff', text: '#2563eb', border: '#dbeafe' },
    zinc: { bg: '#f9fafb', text: '#18181b', border: '#f1f5f9' },
  };
  const c = colors[color] || colors.zinc;
  return (
    <div className="card shadow-sm" style={{ padding: 24, borderRadius: 32, border: '1px solid #f1f5f9' }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text, marginBottom: 16 }}>
        {icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: '#18181b' }}>
        {value}
        {suffix && <span style={{ fontSize: 12, marginLeft: 4, color: '#71717a', fontWeight: 700 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function CostRow({ label, value, bold = false }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <span style={{ fontSize: 13, color: bold ? '#18181b' : '#64748b', fontWeight: bold ? 800 : 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: bold ? 900 : 700, color: bold ? '#18181b' : '#475569' }}>
        ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
