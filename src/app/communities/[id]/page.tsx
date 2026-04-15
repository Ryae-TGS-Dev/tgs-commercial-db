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
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{community.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{community.company}</span>
              {tags.map((t: any) => (
                <span key={t} className="badge badge-neutral">{t}</span>
              ))}
              <span className={`badge ${community.status === 'Active' ? 'badge-green' : 'badge-neutral'}`}>
                {community.status || 'Active'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {isPowerUser && <EditCommunityModal community={community} />}
            <Link href={`/log?community=${encodeURIComponent(community.name)}&id=${community.id}`}
              className="btn btn-primary">
              <ClipboardList size={14} /> Record Service
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="fade-up fade-up-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon={<DollarSign size={16} />} label="Monthly Contract" value={`$${parseFloat(contract.total_monthly || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="green" />
        <StatCard icon={<DollarSign size={16} />} label="Annual Contract" value={`$${((parseFloat(contract.total_monthly || 0)) * 12).toLocaleString('en-US', { minimumFractionDigits: 0 })}`} color="green" />
        <StatCard icon={<CalendarDays size={16} />} label="Service Visits" value={history.length.toString()} color="blue" />
        <StatCard icon={<User size={16} />} label="Crew Leaders" value={leaders.length.toString()} color="amber" />
      </div>

      {/* Summary Cards Row */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>

        {/* Service Cost Breakdown */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Package size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Service Cost Breakdown</span>
          </div>
          <CostRow label="Materials" value={totalMaterials} />
          <CostRow label={`Labor ($${laborRate.toFixed(2)}/hr × crew)`} value={totalLaborCost} />
          <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
          <CostRow label={`Total Cost (${history.length} visits)`} value={totalCost} bold />
          
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Active Contract Mapping</div>
            {allComponents.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>No mapped components.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allComponents.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {[c.area, c.zone].filter(Boolean).join(' • ') || 'Master Community'}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                      ${parseFloat(c.price).toFixed(2)}/mo
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Usage */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Leaf size={14} color="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Product Usage (All Time)</span>
          </div>
          {topMaterials.length === 0 ? (
            <div style={{ color: 'var(--text-subtle)', fontSize: 12 }}>No product data logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topMaterials.map((m: any) => (
                <div key={m.sku}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{m.sku}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace', fontWeight: 600 }}>{m.total_qty} bags</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${Math.min(100, (m.total_qty / 200) * 100)}%` }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-subtle)', marginTop: 2 }}>${m.total_cost.toFixed(2)} total material cost</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crew Leaders */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <User size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Crew Leaders</span>
          </div>
          {leaders.length === 0 ? (
            <div style={{ color: 'var(--text-subtle)', fontSize: 12 }}>No crew data on record.</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {leaders.map((l: any) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 10px 3px 4px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {l.charAt(0).toUpperCase()}
                  </div>
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-Width Service History Table */}
      <div className="fade-up fade-up-3 card" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Service History</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Last 50 visits</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tgs-table" style={{ fontSize: 12, minWidth: 1240 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 100, whiteSpace: 'nowrap' }}>Date</th>
                <th style={{ minWidth: 150 }}>Location Details</th>
                <th style={{ minWidth: 240 }}>Service Performed</th>
                <th style={{ minWidth: 150 }}>Crew Leader</th>
                <th style={{ minWidth: 70, textAlign: 'right', whiteSpace: 'nowrap' }}>Hours</th>
                <th style={{ minWidth: 60, textAlign: 'center' }}>Crew</th>
                <th style={{ minWidth: 180 }}>Materials Used</th>
                <th style={{ textAlign: 'right', minWidth: 120, whiteSpace: 'nowrap' }}>Labor Cost</th>
                {isPowerUser && <th style={{ minWidth: 100, textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {historyWithMaterials.map((h: any) => {
                const hrs = parseFloat(h.total_labor_hours_num || 0);
                const crew = parseInt(h.crew_count || 1);
                const rowLaborCost = hrs * crew * laborRate;
                return (
                  <tr key={h.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="badge badge-neutral">
                        {new Date(h.service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {[h.area_name, h.zone_name].filter(Boolean).join(' — ') || 'Master Portfolio'}
                    </td>
                    <td>
                      <ServiceDisplay text={h.service_performed} />
                    </td>
                    <td>
                      <CrewLeaderDisplay name={h.crew_leader} crewMembers={h.crew_members} size="sm" />
                    </td>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'right', fontFamily: 'monospace' }}>{hrs > 0 ? hrs.toFixed(2) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{h.crew_count || '—'}</td>
                    <td>
                      {h.materials?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {h.materials.map((m: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{m.products?.sku}</span>
                              <span className="badge badge-neutral" style={{ padding: '1px 5px', fontSize: 10 }}>{m.quantity_used} bags</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: rowLaborCost > 0 ? 'var(--text)' : 'var(--text-subtle)', fontWeight: rowLaborCost > 0 ? 600 : 400 }}>
                      {rowLaborCost > 0 ? `$${rowLaborCost.toFixed(2)}` : '—'}
                    </td>
                    {isPowerUser && (
                      <td style={{ textAlign: 'right' }}>
                        <EditLogModal log={h} />
                      </td>
                    )}
                  </tr>
                );
              })}
              {historyWithMaterials.length === 0 && (
                <tr><td colSpan={isPowerUser ? 9 : 8} style={{ textAlign: 'center', color: 'var(--text-subtle)', padding: 40 }}>No service history found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors: any = {
    green: { bg: 'var(--accent-dim)', text: 'var(--accent)', border: 'var(--accent-border)' },
    blue: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.25)' },
    amber: { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  };
  const c = colors[color];
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.text, marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function CostRow({ label, value, bold = false }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: bold ? 'var(--text)' : 'var(--text-muted)', fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: bold ? 700 : 600, color: bold ? 'var(--accent)' : 'var(--text-muted)' }}>
        ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
