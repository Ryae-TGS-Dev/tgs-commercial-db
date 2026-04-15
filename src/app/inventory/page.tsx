'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Package, Users, Download, TrendingUp, RotateCcw } from 'lucide-react';
import { CrewLeaderDisplay } from '@/components/CrewLeaderDisplay';

export default function InventoryPage() {
  const { services, products, loading, laborRate, refreshData } = useData();
  const [activeTab, setActiveTab] = useState<'materials' | 'crews'>('materials');
  
  // Crew Filter
  const [crewMonthFilter, setCrewMonthFilter] = useState<string>('All');

  const totalMaterialCost = useMemo(() => {
    let cost = 0;
    services.forEach(s => {
      s.service_product_usage.forEach((u: any) => {
        cost += (u.quantity_used || 0) * (u.products?.unit_price || 0);
      });
    });
    return cost;
  }, [services]);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Sorting
  const [crewSort, setCrewSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'visits', direction: 'desc' });
  const [materialSort, setMaterialSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });

  const materialSummary = useMemo(() => {
    const summary: Record<string, { sku: string; qty: number; cost: number; price: number }> = {};
    services.forEach(s => {
      s.service_product_usage.forEach((u: any) => {
        const sku = u.products?.sku || 'Unknown';
        if (!summary[sku]) summary[sku] = { sku, qty: 0, cost: 0, price: u.products?.unit_price || 0 };
        summary[sku].qty += (u.quantity_used || 0);
        summary[sku].cost += (u.quantity_used || 0) * (u.products?.unit_price || 0);
      });
    });
    
    const items = Object.values(summary);
    return items.sort((a, b) => {
      let valA: any = a[materialSort.key as keyof typeof a];
      let valB: any = b[materialSort.key as keyof typeof b];
      
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return materialSort.direction === 'asc' ? cmp : -cmp;
      }
      return materialSort.direction === 'asc' ? valA - valB : valB - valA;
    });
  }, [services, materialSort]);

  // Handle Crew Stats
  const { crewStats, availableMonths } = useMemo(() => {
    const months = new Set<string>();
    const crewMap: Record<string, any> = {};
    
    let filteredServices = services;
    
    services.forEach(s => {
      if (s.service_date) months.add(s.service_date.substring(0, 7));
    });

    if (crewMonthFilter !== 'All') {
      filteredServices = services.filter(s => s.service_date && s.service_date.startsWith(crewMonthFilter));
    }

    filteredServices.forEach(s => {
      if (!s.crew_leader) return;
      const leader = s.crew_leader;
      const members = s.crew_members;
      if (!crewMap[leader]) {
        crewMap[leader] = { name: leader, members: members, visits: 0, hours: 0, lastVisit: s.service_date };
      }
      crewMap[leader].visits += 1;
      crewMap[leader].hours += parseFloat(s.total_labor_hours_num || 0);
      if (new Date(s.service_date) > new Date(crewMap[leader].lastVisit)) {
        crewMap[leader].lastVisit = s.service_date;
      }
    });

    const items = Object.values(crewMap).map(c => ({
      ...c,
      avgHours: c.hours / c.visits
    }));

    const sortedItems = items.sort((a, b) => {
      let valA: any = a[crewSort.key as keyof typeof a];
      let valB: any = b[crewSort.key as keyof typeof b];
      
      if (crewSort.key === 'lastVisit') {
        const dA = new Date(valA).getTime();
        const dB = new Date(valB).getTime();
        return crewSort.direction === 'asc' ? dA - dB : dB - dA;
      }
      
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return crewSort.direction === 'asc' ? cmp : -cmp;
      }
      return crewSort.direction === 'asc' ? valA - valB : valB - valA;
    });

    const sortedMonths = Array.from(months).sort().reverse();
    return {
      crewStats: sortedItems,
      availableMonths: sortedMonths
    };
  }, [services, crewMonthFilter, crewSort]);

  const toggleCrewSort = (key: string) => {
    setCrewSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const toggleMaterialSort = (key: string) => {
    setMaterialSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ config, column }: { config: any, column: string }) => {
    if (config.key !== column) return <span style={{ opacity: 0.2, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{config.direction === 'desc' ? '↓' : '↑'}</span>;
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div className="fade-up" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Resources & Logistics
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Materials & Labor</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Tracking material consumption and workforce efficiency.
          </p>
        </div>
      </div>

      <div className="fade-up fade-up-1" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        <Tab active={activeTab === 'materials'} onClick={() => setActiveTab('materials')} icon={<Package size={14} />} label="Material Usage" />
        <Tab active={activeTab === 'crews'} onClick={() => setActiveTab('crews')} icon={<Users size={14} />} label="Crew Leader Stats" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <RotateCcw size={32} color="var(--accent)" className="animate-spin" />
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Analyzing inventory database</div>
        </div>
      ) : activeTab === 'materials' ? (
        <div className="fade-up fade-up-2">
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>All-Time Material Spend</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalMaterialCost)}</div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Total Bags Logged</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                {materialSummary.reduce((sum, item) => sum + item.qty, 0).toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>all time</span>
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>Products Tracked</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{materialSummary.length} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>variants used</span></div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total Material Consumption Summary</span>
            </div>
            <table className="tgs-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleMaterialSort('sku')}>Product SKU <SortIcon config={materialSort} column="sku" /></th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleMaterialSort('price')}>Unit Price <SortIcon config={materialSort} column="price" /></th>
                  <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleMaterialSort('qty')}>Total Quantity Used <SortIcon config={materialSort} column="qty" /></th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleMaterialSort('cost')}>Total Estimated Cost <SortIcon config={materialSort} column="cost" /></th>
                </tr>
              </thead>
              <tbody>
                {materialSummary.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No product usage found.</td></tr>
                ) : (
                  materialSummary.map((m) => (
                    <tr key={m.sku}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{m.sku}</div>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                        {fmt(m.price)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: 13 }}>{m.qty.toLocaleString()} bags</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                        {fmt(m.cost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="fade-up fade-up-2">
          {/* Crew Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Crew Leader Productivity</span>
              <select 
                title="Month filter"
                value={crewMonthFilter} 
                onChange={(e) => setCrewMonthFilter(e.target.value)}
                className="input py-1 px-2 text-xs font-semibold"
              >
                <option value="All">All Time</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <table className="tgs-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleCrewSort('name')}>Crew Leader <SortIcon config={crewSort} column="name" /></th>
                  <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleCrewSort('visits')}>Total Visits <SortIcon config={crewSort} column="visits" /></th>
                  <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleCrewSort('hours')}>Total Hours <SortIcon config={crewSort} column="hours" /></th>
                  <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleCrewSort('avgHours')}>Avg Hours / Visit <SortIcon config={crewSort} column="avgHours" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleCrewSort('lastVisit')}>Last Visit <SortIcon config={crewSort} column="lastVisit" /></th>
                </tr>
              </thead>
              <tbody>
                {crewStats.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No crew history found for this period.</td></tr>
                ) : (
                  crewStats.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                            {c.name.charAt(0)}
                          </div>
                          <CrewLeaderDisplay name={c.name} crewMembers={c.members} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.visits}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{c.hours.toFixed(1)} hrs</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.avgHours.toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-subtle)' }}>hrs per visit</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(c.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
}
    </div>
  );
}

function Tab({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        color: active ? 'var(--accent)' : 'var(--text-subtle)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        transition: 'all 0.15s',
        marginBottom: -1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}
