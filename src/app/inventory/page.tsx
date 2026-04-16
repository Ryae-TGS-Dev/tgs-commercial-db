'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Package, Users, Download, TrendingUp, RotateCcw, ClipboardList, Boxes, Info } from 'lucide-react';
import { CrewLeaderDisplay } from '@/components/CrewLeaderDisplay';
import { Tooltip } from '@/components/Tooltip';

export default function InventoryPage() {
  const { services, products, loading, laborRate, refreshData } = useData();
  const [activeTab, setActiveTab] = useState<'materials' | 'crews'>('materials');
  const [crewMonthFilter, setCrewMonthFilter] = useState<string>('All');
  const [crewSort, setCrewSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'visits', direction: 'desc' });
  const [materialSort, setMaterialSort] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });

  const { totalMaterialCost, totalLaborCost, skuConcentration } = useMemo(() => {
    let mCost = 0;
    let lCost = 0;
    const summary: Record<string, number> = {};

    services.forEach(s => {
      // Labor
      lCost += (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate;
      
      // Materials
      s.service_product_usage.forEach((u: any) => {
        const itemCost = (u.quantity_used || 0) * (u.products?.unit_price || 0);
        mCost += itemCost;
        
        const sku = u.products?.sku || 'Unknown';
        summary[sku] = (summary[sku] || 0) + itemCost;
      });
    });

    const topSkuValue = Math.max(0, ...Object.values(summary));
    const concentration = mCost > 0 ? (topSkuValue / mCost) * 100 : 0;

    return { totalMaterialCost: mCost, totalLaborCost: lCost, skuConcentration: concentration };
  }, [services, laborRate]);

  const fmtFull = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const materialSummary = useMemo(() => {
    const summary: Record<string, { sku: string; qty: number; cost: number; price: number }> = {};
    const detectUnit = (sku: string, dbUnit?: string) => {
      if (dbUnit && dbUnit.toUpperCase() !== 'QTY') return dbUnit;
      const match = sku.match(/\(([^)]+)\)/);
      if (match) return match[1];
      return dbUnit || 'QTY';
    };

    services.forEach(s => {
      s.service_product_usage.forEach((u: any) => {
        const sku = u.products?.sku || 'Unknown';
        const unit = detectUnit(sku, u.products?.unit);
        if (!summary[sku]) summary[sku] = { sku, qty: 0, cost: 0, price: u.products?.unit_price || 0, unit };
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

  const { crewStats, availableMonths } = useMemo(() => {
    const months = new Set<string>();
    const crewMap: Record<string, any> = {};
    let filteredServices = services;
    
    services.forEach(s => { if (s.service_date) months.add(s.service_date.substring(0, 7)); });
    if (crewMonthFilter !== 'All') {
      filteredServices = services.filter(s => s.service_date && s.service_date.startsWith(crewMonthFilter));
    }

    filteredServices.forEach(s => {
      if (!s.crew_leader) return;
      const leader = s.crew_leader;
      if (!crewMap[leader]) {
        crewMap[leader] = { name: leader, members: s.crew_members, visits: 0, hours: 0, lastVisit: s.service_date };
      }
      crewMap[leader].visits += 1;
      crewMap[leader].hours += parseFloat(s.total_labor_hours_num || 0);
      if (new Date(s.service_date) > new Date(crewMap[leader].lastVisit)) crewMap[leader].lastVisit = s.service_date;
    });

    const items = Object.values(crewMap).map(c => ({ ...c, avgHours: c.hours / c.visits }));
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

    return { crewStats: sortedItems, availableMonths: Array.from(months).sort().reverse() };
  }, [services, crewMonthFilter, crewSort]);

  const SortIcon = ({ config, column }: { config: any, column: string }) => {
    if (config.key !== column) return <span style={{ opacity: 0.2, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{config.direction === 'desc' ? '↓' : '↑'}</span>;
  };

  const toggleCrewSort = (key: string) => setCrewSort(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  const toggleMaterialSort = (key: string) => setMaterialSort(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1600, margin: "0 auto" }}>
      
      {/* Header - Unified with Intelligence Suite */}
      <div className="fade-up" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ background: '#18181b', padding: 8, borderRadius: 10, color: 'white' }}>
               <Boxes size={18} />
             </div>
             <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Materials & Labor</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <RotateCcw size={32} className="animate-spin text-zinc-900" />
        </div>
      ) : (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Dark Pulse Hero - Unified Aesthetic */}
          <div className="bg-[#09090b] text-white rounded-[32px] p-8 shadow-xl space-y-6 border border-zinc-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Total Material Spend</div>
                    <Tooltip content="Sum of all unit costs across all historical service logs.">
                      <Info size={14} className="text-amber-500 hover:text-amber-400 transition-colors cursor-help" />
                    </Tooltip>
                  </div>
                </div>
                <div className="text-5xl font-black tracking-tighter leading-none">{fmtFull(totalMaterialCost)}</div>
                <div className="text-[13px] font-medium text-zinc-300 mt-2">Total spend on materials across all communities.</div>
              </div>
              <div className="text-right flex gap-12">
                 <div>
                   <div className="flex items-center justify-end gap-2 mb-1">
                     <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Total Items Used</div>
                     <Tooltip content="Includes every bag, gallon, or unit ever reported.">
                       <Info size={14} className="text-amber-500 hover:text-amber-400 transition-colors cursor-help" />
                     </Tooltip>
                   </div>
                   <div className="text-3xl font-black text-white">{materialSummary.reduce((sum, item) => sum + item.qty, 0).toLocaleString()}</div>
                 </div>
                 <div>
                   <div className="flex items-center justify-end gap-2 mb-1">
                     <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Unique SKUs</div>
                     <Tooltip content="The number of different products currently in your catalog.">
                       <Info size={14} className="text-amber-500 hover:text-amber-400 transition-colors cursor-help" />
                     </Tooltip>
                   </div>
                   <div className="text-3xl font-black text-white">{materialSummary.length}</div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-800/50">
               <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Labor vs. Material Cost</div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{((totalLaborCost / (totalLaborCost + totalMaterialCost || 1)) * 100).toFixed(0)} / {((totalMaterialCost / (totalLaborCost + totalMaterialCost || 1)) * 100).toFixed(0)} %</div>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden flex">
                    <div className="h-full bg-zinc-600" style={{ width: `${(totalLaborCost / (totalLaborCost + totalMaterialCost || 1)) * 100}%` }} />
                    <div className="h-full bg-emerald-500" style={{ width: `${(totalMaterialCost / (totalLaborCost + totalMaterialCost || 1)) * 100}%` }} />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Top Product Usage</div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{skuConcentration.toFixed(1)}%</div>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${skuConcentration}%` }} />
                  </div>
               </div>
            </div>
          </div>

          {/* List Overhaul */}
          <div className="card" style={{ overflow: 'hidden', borderRadius: 32 }}>
            <div className="flex bg-zinc-50 dark:bg-zinc-900/50 p-1">
              <button onClick={() => setActiveTab('materials')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all ${activeTab === 'materials' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>MATERIAL INVENTORY</button>
              <button onClick={() => setActiveTab('crews')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all ${activeTab === 'crews' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>CREW PRODUCTIVITY</button>
            </div>

            {activeTab === 'crews' && (
              <div className="p-4 border-b border-zinc-100 flex justify-end">
                <select value={crewMonthFilter} onChange={(e) => setCrewMonthFilter(e.target.value)} className="input py-2 px-4 text-[11px] font-black uppercase tracking-widest bg-zinc-50 border-none outline-none cursor-pointer w-[160px] rounded-xl">
                  <option value="All">All Time</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            <div style={{ overflowX: 'auto', maxHeight: 800 }}>
              <table className="tgs-table">
                <thead>
                  {activeTab === 'materials' ? (
                    <tr>
                      <th style={{ padding: '16px 24px', cursor: 'pointer' }} onClick={() => toggleMaterialSort('sku')}>Product SKU <SortIcon config={materialSort} column="sku" /></th>
                      <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleMaterialSort('price')}>Unit Price <SortIcon config={materialSort} column="price" /></th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleMaterialSort('qty')}>Quantity Consumed <SortIcon config={materialSort} column="qty" /></th>
                      <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => toggleMaterialSort('cost')}>Estimated Cost <SortIcon config={materialSort} column="cost" /></th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ padding: '16px 24px', cursor: 'pointer' }} onClick={() => toggleCrewSort('name')}>Crew Leader</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleCrewSort('visits')}>Total Visits</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleCrewSort('hours')}>Total Hours</th>
                      <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleCrewSort('avgHours')}>Avg / Visit</th>
                      <th style={{ cursor: 'pointer' }} onClick={() => toggleCrewSort('lastVisit')}>Recent Activity <SortIcon config={crewSort} column="lastVisit" /></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {activeTab === 'materials' ? (
                    materialSummary.map((m) => (
                      <tr key={m.sku}>
                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 900, fontSize: 13, color: '#18181b' }}>{m.sku}</div>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', color: '#71717a' }}>{fmtFull(m.price)}</td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span className="badge badge-zinc" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {m.qty.toLocaleString()} 
                            <span style={{ opacity: 0.5, fontSize: 10, letterSpacing: '0.05em', fontWeight: 900 }}>
                              {(m as any).unit?.toUpperCase() || 'QTY'}
                            </span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{fmtFull(m.cost)}</td>
                      </tr>
                    ))
                  ) : (
                    crewStats.map((c) => (
                      <tr key={c.name}>
                        <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#18181b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>{c.name.charAt(0)}</div>
                            <CrewLeaderDisplay name={c.name} crewMembers={c.members} size="sm" />
                          </div>
                        </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 800 }}>{c.visits}</td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', color: '#71717a', fontWeight: 600 }}>{c.hours.toFixed(1)} hrs</td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>{c.avgHours.toFixed(1)}</span>
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', display: 'block' }}>hrs / visit</span>
                        </td>
                        <td style={{ verticalAlign: 'middle' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#71717a' }}>
                            {new Date(c.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .badge-zinc { background: #f4f4f5; color: #18181b; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; border: 1px solid #e4e4e7; }
        .input:hover { border-color: #18181b; }
      `}} />
    </div>
  );
}
