'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Filter,
  Download,
  Calendar,
  Building2,
  HardHat,
  Package,
  DollarSign,
  ChevronDown,
  Loader2,
  Activity,
  FileSpreadsheet,
  Search,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  ClipboardList
} from 'lucide-react';
import { CrewLeaderDisplay } from '@/components/CrewLeaderDisplay';
import { ServiceDisplay } from '@/components/ServiceDisplay';
import { CommunityDrawer } from '@/components/CommunityDrawer';
import { useUser } from '@/hooks/useUser';
import { useData } from '@/context/DataContext';

// Types
type Product = { id: string; sku: string; unit_price: number };
type Community = { id: string; name: string; company: string; total_monthly_price: number };
type ServiceProductUsage = { quantity_used: number; products: { sku: string; unit_price: number } };
type ServiceHistory = {
  id: string;
  service_date: string;
  source_community_name: string;
  community_id: string | null;
  service_performed: string;
  crew_leader: string;
  crew_members?: string | null;
  total_labor_hours_num: number;
  crew_count: number;
  service_product_usage: ServiceProductUsage[];
};

export default function ReportsPage() {
  const { profile } = useUser();
  const permissions = profile?.role || {};
  
  const { 
    services, 
    communities, 
    products, 
    laborRate, 
    loading, 
    lastRefreshed 
  } = useData();

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Custom multi-select states
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productLogic, setProductLogic] = useState<'AND' | 'OR'>('OR');
  
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minMaterial, setMinMaterial] = useState('');
  const [maxMaterial, setMaxMaterial] = useState('');
  const [minLabor, setMinLabor] = useState('');
  const [maxLabor, setMaxLabor] = useState('');

  const [activeTab, setActiveTab] = useState<'raw' | 'monthly'>('monthly');
  const [selectedCommunityForDrawer, setSelectedCommunityForDrawer] = useState<string | null>(null);
  const [precisionFilter, setPrecisionFilter] = useState<'all' | 'waste' | 'bullseye' | 'low-coverage'>('all');

  const formatMonth = (mKey: string) => {
    if (!mKey) return '';
    const [y, m] = mKey.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  // Compute filtered dataset
  const filteredData = useMemo(() => {
    let filtered = services;

    if (dateFrom) filtered = filtered.filter(s => s.service_date >= dateFrom);
    if (dateTo) filtered = filtered.filter(s => s.service_date <= dateTo);
    
    if (selectedCommunities.length > 0) {
      const commSet = new Set(selectedCommunities);
      filtered = filtered.filter(s => s.community_id && commSet.has(s.community_id));
    }
    if (selectedCompanies.length > 0) {
      const compSet = new Set(selectedCompanies);
      filtered = filtered.filter(s => {
        if (!s.community_id) return false;
        const comm = communities.find(c => c.id === s.community_id);
        return comm && compSet.has(comm.company);
      });
    }

    if (selectedProducts.length > 0) {
      if (productLogic === 'AND') {
        filtered = filtered.filter(s => {
          const usedSkus = new Set(s.service_product_usage.map(u => u.products?.sku).filter(Boolean));
          return selectedProducts.every(p => usedSkus.has(p));
        });
      } else {
        filtered = filtered.filter(s => {
          const usedSkus = new Set(s.service_product_usage.map(u => u.products?.sku).filter(Boolean));
          return selectedProducts.some(p => usedSkus.has(p));
        });
      }
    }

    const monthlyGroups: Record<string, any> = {};

    filtered.forEach(s => {
      if (!s.community_id) return;
      const m = s.service_date.substring(0, 7);
      const key = `${s.community_id}_${m}`;
      const comm = communities.find(c => c.id === s.community_id);
      const laborRateToUse = s.applied_labor_rate || laborRate;
      const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRateToUse;
      let matCost = 0;

      s.service_product_usage.forEach(u => {
        const productPrice = u.applied_unit_price || u.products?.unit_price || 0;
        matCost += (u.quantity_used || 0) * productPrice;
      });

      if (!monthlyGroups[key]) {
        monthlyGroups[key] = {
          communityId: s.community_id,
          commName: comm?.name || s.source_community_name,
          monthKey: m,
          totalLaborCost: 0,
          totalMaterialCost: 0,
          totalVariance: 0,
          totalEff: 0,
          effCount: 0,
          monthlyPrice: s.applied_contract_value || comm?.total_monthly_price || 0,
          services: []
        };
      }
      
      monthlyGroups[key].totalLaborCost += laborCost;
      monthlyGroups[key].totalMaterialCost += matCost;
      monthlyGroups[key].services.push(s);

      s.service_product_usage.forEach(u => {
        const qty = u.quantity_used || 0;
        const coverage = (u.products as any)?.coverage_sqft || 0;
        if (qty > 0 && coverage > 0 && comm?.square_footage) {
           const targetQty = comm.square_footage / coverage;
           monthlyGroups[key].totalEff += (targetQty / qty) * 100;
           monthlyGroups[key].effCount++;
           monthlyGroups[key].totalVariance += (qty - targetQty) * (u.products?.unit_price || 0);
        }
      });
    });

    const validKeys = new Set(Object.keys(monthlyGroups).filter(key => {
      const g = monthlyGroups[key];
      if (minPrice && g.monthlyPrice < parseFloat(minPrice)) return false;
      if (maxPrice && g.monthlyPrice > parseFloat(maxPrice)) return false;
      if (minMaterial && g.totalMaterialCost < parseFloat(minMaterial)) return false;
      if (maxMaterial && g.totalMaterialCost > parseFloat(maxMaterial)) return false;
      if (minLabor && g.totalLaborCost < parseFloat(minLabor)) return false;
      if (maxLabor && g.totalLaborCost > parseFloat(maxLabor)) return false;
      return true;
    }));

    const hasNumFilters = !!(minPrice || maxPrice || minMaterial || maxMaterial || minLabor || maxLabor);
    
    if (hasNumFilters) {
      filtered = filtered.filter(s => {
        if (!s.community_id) return false;
        const key = `${s.community_id}_${s.service_date.substring(0, 7)}`;
        return validKeys.has(key);
      });
    }

    const finalMonthlyGroups = Object.keys(monthlyGroups)
      .filter(k => !hasNumFilters || validKeys.has(k))
      .map(k => {
        const g = monthlyGroups[k];
        const avgEff = g.effCount > 0 ? (g.totalEff / g.effCount) : null;
        return { ...g, avgEff, formattedMonth: formatMonth(g.monthKey) };
      })
      .filter(g => {
        if (precisionFilter === 'all') return true;
        if (g.avgEff === null) return false;
        if (precisionFilter === 'waste') return g.avgEff < 90;
        if (precisionFilter === 'bullseye') return g.avgEff >= 90 && g.avgEff <= 110;
        if (precisionFilter === 'low-coverage') return g.avgEff > 110;
        return true;
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey) || a.commName.localeCompare(b.commName));

    return { raw: filtered, monthly: finalMonthlyGroups };
  }, [services, communities, dateFrom, dateTo, selectedCommunities, selectedCompanies, selectedProducts, productLogic, minPrice, maxPrice, minMaterial, maxMaterial, minLabor, maxLabor, laborRate, precisionFilter]);

  const { totalRawLabor, totalRawMaterial, totalServiceVisits, totalRawRevenue, totalProfit, totalVariance } = useMemo(() => {
    let tLab = 0, tMat = 0, tVar = 0, tRev = 0;
    filteredData.monthly.forEach(g => {
       tLab += g.totalLaborCost; tMat += g.totalMaterialCost; tVar += g.totalVariance; tRev += g.monthlyPrice;
    });
    return {
      totalRawLabor: tLab,
      totalRawMaterial: tMat,
      totalServiceVisits: filteredData.raw.length,
      totalRawRevenue: tRev,
      totalProfit: tRev - (tLab + tMat),
      totalVariance: tVar
    };
  }, [filteredData]);

  const companiesList = Array.from(new Set(communities.map(c => c.company).filter(Boolean))).sort();
  const communityOptions = communities.map(c => ({ label: c.name, value: c.id }));
  const companyOptions = companiesList.map(c => ({ label: c, value: c }));
  const productOptions = products.map(p => ({ label: p.sku, value: p.sku }));

  const fmtFull = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportCSV = () => {
    let csvStr = '';
    if (activeTab === 'monthly') {
      csvStr = 'Month,Community,Monthly Contract Value,Total Labor Cost,Total Material Cost,Visits\n';
      filteredData.monthly.forEach(g => {
        csvStr += `"${g.monthKey}","${g.commName}",${g.monthlyPrice},${g.totalLaborCost.toFixed(2)},${g.totalMaterialCost.toFixed(2)},${g.services.length}\n`;
      });
    } else {
      csvStr = 'Date,Community,Service Performed,Crew Leader,Materials Used,Labor Cost,Material Cost\n';
      filteredData.raw.forEach(s => {
        const laborRateToUse = s.applied_labor_rate || laborRate;
        const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRateToUse;
        const matCost = s.service_product_usage.reduce((sum, u) => {
          const productPrice = u.applied_unit_price || u.products?.unit_price || 0;
          return sum + (u.quantity_used || 0) * productPrice;
        }, 0);
        const mats = s.service_product_usage.map(u => `${u.products?.sku || 'Unknown'} (${u.quantity_used})`).join(', ');
        csvStr += `"${s.service_date}","${s.source_community_name}","${s.service_performed.replace(/"/g, '""')}","${s.crew_leader}","${mats}",${laborCost.toFixed(2)},${matCost.toFixed(2)}\n`;
      });
    }
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tgs_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1600, margin: "0 auto" }}>
      
      {/* Header - Aligned with Analytics */}
      <div className="fade-up" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ background: '#18181b', padding: 8, borderRadius: 10, color: 'white' }}>
               <ClipboardList size={18} />
             </div>
             <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Financial Reports</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {permissions.can_export_csv && (
            <button onClick={exportCSV} disabled={loading} className="btn-export">
              <Download size={14} /> Export Dataset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <Loader2 size={32} className="animate-spin text-zinc-900" />
        </div>
      ) : (
        <div className="fade-up" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          
          {/* Filters - High Density */}
          <div style={{ width: 340, flexShrink: 0, position: 'sticky', top: 24 }}>
            <div className="card" style={{ padding: 24, borderRadius: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Filter size={14} className="text-zinc-400" />
                <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Filter Results</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <label className="filter-label">Service Date Range</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="date" className="input text-xs" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>to</div>
                    <input type="date" className="input text-xs" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="filter-label">Efficiency Filter</label>
                  <select value={precisionFilter} onChange={e => setPrecisionFilter(e.target.value as any)} className="input text-xs">
                    <option value="all">View All Results</option>
                    <option value="waste">Filter: Waste (&lt;90%)</option>
                    <option value="bullseye">Filter: Bullseye (90-110%)</option>
                    <option value="low-coverage">Filter: Low Coverage (&gt;110%)</option>
                  </select>
                </div>

                <div>
                  <label className="filter-label">Companies & Communities</label>
                  <MultiSelectCombobox options={companyOptions} selected={selectedCompanies} onChange={setSelectedCompanies} placeholder="Filter Companies..." />
                  <div style={{ height: 6 }} />
                  <MultiSelectCombobox options={communityOptions} selected={selectedCommunities} onChange={setSelectedCommunities} placeholder="Filter Communities..." />
                </div>

                <div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                     <label className="filter-label" style={{ marginBottom: 0 }}>Product Usage</label>
                     <button onClick={() => setProductLogic(l => l === 'OR' ? 'AND': 'OR')} className="text-[9px] font-black text-zinc-400 hover:text-zinc-900 uppercase">
                       Mode: {productLogic}
                     </button>
                   </div>
                   <MultiSelectCombobox options={productOptions} selected={selectedProducts} onChange={setSelectedProducts} placeholder="Filter Products..." />
                </div>

                <div style={{ height: 1, background: '#f1f5f9' }} />

                <div className="space-y-4">
                  <div>
                    <label className="filter-label">Monthly Contract ($)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" placeholder="Min" className="input text-xs" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                      <input type="number" placeholder="Max" className="input text-xs" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="filter-label">Total Cost ($)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="number" placeholder="Min Labor" className="input text-xs" value={minLabor} onChange={e => setMinLabor(e.target.value)} />
                      <input type="number" placeholder="Min Material" className="input text-xs" value={minMaterial} onChange={e => setMinMaterial(e.target.value)} />
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-ghost py-2 text-[10px] font-black uppercase text-zinc-400 hover:text-rose-600"
                  onClick={() => {
                    setDateFrom(''); setDateTo(''); setSelectedCommunities([]); setSelectedCompanies([]); setSelectedProducts([]);
                    setMinPrice(''); setMaxPrice(''); setMinLabor(''); setMaxLabor(''); setMinMaterial(''); setMaxMaterial(''); setPrecisionFilter('all');
                  }}
                >
                  Reset Parameters
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Dark Pulse Hero - Unified with Analytics */}
            <div className="fade-up bg-[#09090b] text-white rounded-[32px] p-8 shadow-xl space-y-6 border border-zinc-800">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className={`w-4 h-4 ${totalProfit > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                    <div className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Net Profit</div>
                  </div>
                  <div className="text-5xl font-black tracking-tighter leading-none">{fmtFull(totalProfit)}</div>
                  <div className="text-[13px] font-medium text-zinc-300 mt-2">Total profit across filtered dataset.</div>
                </div>
                <div className="text-right flex gap-12">
                   <div>
                     <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contract MRR</div>
                     <div className="text-3xl font-black">{fmtFull(totalRawRevenue)}</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Visits</div>
                     <div className="text-3xl font-black text-white">{totalServiceVisits.toLocaleString()}</div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-zinc-800/50">
                 <div className="space-y-2">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Labor Cost</div>
                    <div className="text-xl font-black tracking-tighter text-white">{fmtFull(totalRawLabor)}</div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-zinc-700 w-full" /></div>
                 </div>
                 <div className="space-y-2">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Material Cost</div>
                    <div className="text-xl font-black tracking-tighter text-white">{fmtFull(totalRawMaterial)}</div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden"><div className="h-full bg-amber-500 w-full" /></div>
                 </div>
                 <div className="space-y-2">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Budget Variance</div>
                    <div className={`text-xl font-black tracking-tighter ${totalVariance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {totalVariance > 0 ? '+' : ''}{fmtFull(totalVariance)}
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden"><div className={`h-full ${totalVariance > 0 ? 'bg-rose-500' : 'bg-emerald-500'} w-full`} /></div>
                 </div>
              </div>
            </div>

            {/* List Components */}
            <div className="card" style={{ overflow: 'hidden', borderRadius: 32 }}>
              <div className="flex bg-zinc-50 dark:bg-zinc-900/50 p-1">
                <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all ${activeTab === 'monthly' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>MONTHLY AGGREGATES</button>
                <button onClick={() => setActiveTab('raw')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all ${activeTab === 'raw' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>SERVICE RECORDS</button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 800 }}>
                <table className="tgs-table">
                  <thead>
                    <tr>
                      {activeTab === 'monthly' ? (
                        <>
                          <th style={{ padding: '16px 24px' }}>Month</th>
                          <th>Community</th>
                          <th style={{ textAlign: 'right' }}>Contract</th>
                          <th>Labor Cost</th>
                          <th>Material Cost</th>
                          <th style={{ textAlign: 'center' }}>Precision</th>
                          <th style={{ textAlign: 'center' }}>Visits</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '16px 24px' }}>Date</th>
                          <th>Community</th>
                          <th>Service Performed</th>
                          <th>Crew Leader</th>
                          <th style={{ textAlign: 'right' }}>Burn ($)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === 'monthly' ? (
                      filteredData.monthly.map((g, i) => (
                        <tr key={i}>
                          <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#71717a' }}>{g.formattedMonth}</span>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <button onClick={() => setSelectedCommunityForDrawer(g.communityId)} className="text-[13px] font-black text-zinc-900 hover:underline">{g.commName}</button>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#71717a' }}>{fmtFull(g.monthlyPrice)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>{fmtFull(g.totalLaborCost)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>{fmtFull(g.totalMaterialCost)}</td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            {g.avgEff !== null ? (
                              <div className="flex flex-col items-center">
                                <span style={{ fontSize: 12, fontWeight: 900, color: g.avgEff >= 90 && g.avgEff <= 110 ? '#10b981' : g.avgEff < 90 ? '#f43f5e' : '#f59e0b' }}>
                                  {g.avgEff.toFixed(0)}%
                                </span>
                                <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', opacity: 0.6 }}>
                                  {g.avgEff >= 90 && g.avgEff <= 110 ? 'Bullseye' : g.avgEff < 90 ? 'Over' : 'Under'}
                                </span>
                              </div>
                            ) : <span className="text-zinc-300">—</span>}
                          </td>
                          <td style={{ textAlign: 'center', verticalAlign: 'middle' }}><span className="badge badge-zinc">{g.services.length}</span></td>
                        </tr>
                      ))
                    ) : (
                      filteredData.raw.map((s, i) => {
                        const laborRateToUse = s.applied_labor_rate || laborRate;
                        const totalBurn = ((s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRateToUse) + s.service_product_usage.reduce((sum, u) => {
                          const productPrice = u.applied_unit_price || u.products?.unit_price || 0;
                          return sum + (u.quantity_used || 0) * productPrice;
                        }, 0);
                        return (
                          <tr key={i}>
                            <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}><span style={{ fontSize: 11, fontWeight: 800, color: '#71717a' }}>{s.service_date}</span></td>
                            <td style={{ verticalAlign: 'middle' }}>
                              <button onClick={() => s.community_id && setSelectedCommunityForDrawer(s.community_id)} className="text-[12px] font-black text-zinc-900">{s.source_community_name}</button>
                            </td>
                            <td style={{ verticalAlign: 'middle' }}><ServiceDisplay text={s.service_performed} limitLines={1} size="sm" /></td>
                            <td style={{ verticalAlign: 'middle' }}><CrewLeaderDisplay name={s.crew_leader} crewMembers={s.crew_members} size="xs" /></td>
                            <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, fontSize: 13 }}>{fmtFull(totalBurn)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .filter-label { display: block; font-size: 10px; font-weight: 900; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-style: italic; }
        .btn-export { background: white; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; transition: all 0.2s; cursor: pointer; }
        .btn-export:hover { border-color: #18181b; background: #fafafa; }
        .badge-zinc { background: #f4f4f5; color: #18181b; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid #e4e4e7; }
      `}} />
      
      {selectedCommunityForDrawer && (
        <CommunityDrawer communityId={selectedCommunityForDrawer} onClose={() => setSelectedCommunityForDrawer(null)} />
      )}
    </div>
  );
}

function MultiSelectCombobox({ options, selected, onChange, placeholder }: any) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const available = options.filter((o:any) => !selected.includes(o.value) && o.label.toLowerCase().includes(query.toLowerCase()));
  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((v:any) => v !== val));
    else { onChange([...selected, val]); setQuery(''); }
  };
  return (
    <div className="relative">
      <div className="input flex items-center p-2 gap-2" style={{ borderRadius: 12 }}>
        <Search size={14} className="text-zinc-400" />
        <input type="text" value={query} onChange={e => { setQuery(e.target.value); setIsOpen(true); }} onFocus={() => setIsOpen(true)} onBlur={() => setTimeout(() => setIsOpen(false), 200)} placeholder={placeholder} className="bg-transparent outline-none w-full text-xs font-bold" />
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map((v:any) => (
            <div key={v} className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-zinc-200">
              {options.find((o:any) => o.value === v)?.label}
              <button onClick={() => toggle(v)}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
      {isOpen && available.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl mt-1 max-vh-[200px] overflow-y-auto z-50 shadow-xl p-1">
          {available.map((o:any) => (
            <div key={o.value} onClick={() => toggle(o.value)} className="p-2 text-xs font-bold hover:bg-zinc-50 rounded-lg cursor-pointer">{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}
