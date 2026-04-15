'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ManagementTable from '@/components/ManagementTable';
import { CommunityDrawer } from '@/components/CommunityDrawer';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Package,
  HardHat,
  Activity,
  Calendar,
  Loader2,
  Filter
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getCompanyCurrentMonth, getCompanyToday } from '@/lib/date-utils';



export default function DashboardPage() {
  const { communities, services, laborRate, loading, lastRefreshed, refreshData } = useData();
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  // Date Range State
  const [mode, setMode] = useState<'month' | 'range' | 'all'>('month');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [viewingYear, setViewingYear] = useState<string>(getCompanyToday().substring(0, 4));
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');

  const calculateMonths = useCallback((servData: any[]) => {
    const months = Array.from(new Set(servData.map(s => s.service_date.substring(0, 7))));
    months.sort((a, b) => b.localeCompare(a));
    setAvailableMonths(months);
    
    // Always default to current MTD (Month-to-Date) for consistency with Overview Pulse
    const currentMonth = getCompanyCurrentMonth();
    if (!startMonth) {
      setStartMonth(currentMonth);
      setEndMonth(currentMonth);
    }
  }, [startMonth]);

  useEffect(() => {
    if (services.length > 0) {
      calculateMonths(services);
    }
  }, [services, calculateMonths]);

  const stats = useMemo(() => {
    if (!startMonth || !endMonth) return null;
    const rangeStart = startMonth <= endMonth ? startMonth : endMonth;
    const rangeEnd = startMonth <= endMonth ? endMonth : startMonth;

    let totalLaborCost = 0;
    let totalMaterialCost = 0;
    let totalServiceVisits = 0;
    const skuMap: Record<string, number> = {};
    const activeCommunityMonths = new Set<string>();

    services.forEach(s => {
      const sMonth = s.service_date.substring(0, 7);
      if (mode !== 'all' && (sMonth < rangeStart || sMonth > rangeEnd)) return;
      
      if (s.community_id) activeCommunityMonths.add(`${s.community_id}_${sMonth}`);
      totalServiceVisits++;
      totalLaborCost += (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate;

      s.service_product_usage?.forEach((u: any) => {
        const qty = u.quantity_used || 0;
        totalMaterialCost += qty * (u.products?.unit_price || 0);
        const sku = u.products?.sku;
        if (sku) skuMap[sku] = (skuMap[sku] || 0) + qty;
      });
    });

    let targetRevenue = 0;
    activeCommunityMonths.forEach(key => {
       const commId = key.split('_')[0];
       const c = communities.find(c => c.id === commId);
       if (c) targetRevenue += (c.total_monthly_price || 0);
    });

    const yieldMap: Record<string, { revenue: number, cost: number, totalEff: number, effCount: number }> = {};
    const trackedKeys = new Set<string>(); // Keep track of unique community/month pairs for revenue

    services.forEach(s => {
      const sMonth = s.service_date.substring(0, 7);
      if (mode !== 'all' && (sMonth < rangeStart || sMonth > rangeEnd)) return;
      
      // Resolve ID: Use community_id or look up by name
      let commId = s.community_id;
      if (!commId && s.source_community_name) {
        commId = communities.find(c => c.name?.trim().toLowerCase() === s.source_community_name?.trim().toLowerCase())?.id;
      }
      
      if (!commId) return;
      if (!yieldMap[commId]) yieldMap[commId] = { revenue: 0, cost: 0, totalEff: 0, effCount: 0 };
      
      const comm = communities.find(c => c.id === commId);
      
      // Calculate Revenue once per community/month pair
      const key = `${commId}_${sMonth}`;
      if (!trackedKeys.has(key)) {
        trackedKeys.add(key);
        if (comm) yieldMap[commId].revenue += (comm.total_monthly_price || 0);
      }

      let sCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate;
      
      s.service_product_usage?.forEach((u: any) => {
        const qty = u.quantity_used || 0;
        const coverage = u.products?.coverage_sqft || 0;
        if (qty > 0 && coverage > 0 && comm?.square_footage) {
          const targetQty = comm.square_footage / coverage;
          const currentEff = (targetQty / qty) * 100;
          yieldMap[s.community_id].totalEff += currentEff;
          yieldMap[s.community_id].effCount++;
          if (comm.name.includes('Sonoma')) {
            console.log(`Sonoma Precision Match: ${comm.name} | SQFT: ${comm.square_footage} | Product: ${u.products?.sku} | Coverage: ${coverage} | Qty: ${qty} | Eff: ${currentEff}%`);
          }
        } else if (comm?.name.includes('Sonoma')) {
          console.log(`Sonoma Missing Data: SQFT: ${comm.square_footage}, Coverage: ${coverage}, Qty: ${qty}`);
        }
        sCost += qty * (u.products?.unit_price || 0);
      });
      yieldMap[s.community_id].cost += sCost;
    });

    const communityYieldStats = Object.entries(yieldMap).map(([id, data]) => {
      const comm = communities.find(c => c.id === id);
      if (comm?.status !== 'Active') return null; // Mirror Overview's 'Active' filter
      const margin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : -100;
      const appEfficiency = data.effCount > 0 ? (data.totalEff / data.effCount) : null;
      return { id, name: comm?.name || 'Unknown', margin, revenue: data.revenue, cost: data.cost, appEfficiency };
    }).filter(Boolean) as any[];

    const topYield = communityYieldStats.filter(c => c.margin >= 60 && c.revenue > 0).sort((a,b) => b.margin - a.margin).slice(0, 3);
    const lowYield = communityYieldStats.filter(c => c.margin < 40 && c.cost > 0).sort((a,b) => a.margin - b.margin).slice(0, 3);

    const totalCost = totalLaborCost + totalMaterialCost;
    const avgCostPerVisit = totalServiceVisits > 0 ? totalCost / totalServiceVisits : 0;
    const topSkus = Object.entries(skuMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const multiplier = mode === 'all' ? availableMonths.length : ((parseInt(rangeEnd.split('-')[0]) - parseInt(rangeStart.split('-')[0])) * 12 + parseInt(rangeEnd.split('-')[1]) - parseInt(rangeStart.split('-')[1]) + 1);

    return { targetRevenue, multiplier, totalLaborCost, totalMaterialCost, totalCost, totalServiceVisits, avgCostPerVisit, topSkus, topYield, lowYield, allYields: communityYieldStats };
  }, [communities, services, mode, startMonth, endMonth, laborRate, availableMonths]);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading || !stats) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <Loader2 size={48} className="animate-spin text-zinc-900" />
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Syncing Intelligence</div>
    </div>
  );

  const { targetRevenue, multiplier, totalLaborCost, totalMaterialCost, totalCost, totalServiceVisits, avgCostPerVisit, topSkus, topYield, lowYield, allYields } = stats;

  return (
    <div className="p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Integrated Intelligence Header */}
      <div className="space-y-8">
          <div className="flex items-end gap-12">
            <div className="space-y-1">
              <div className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.25em] leading-none mb-2">Portfolio Intelligence</div>
              <h1 className="text-6xl font-black tracking-tighter text-zinc-900 dark:text-white">Dashboard</h1>
              <p className="text-zinc-500 text-sm font-medium max-w-2xl">Analyze real-time and historical aggregate costs across the entire TGS portfolio.</p>
            </div>
            
            <button 
              onClick={() => refreshData()}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl hover:scale-105 active:scale-95"
            >
              <Activity className={`${loading ? 'animate-spin' : ''} w-4 h-4`} />
              {loading ? 'Syncing...' : 'Sync Live'}
            </button>
          </div>

        {/* Intelligence Command Bar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-10 rounded-[40px] shadow-sm flex flex-col xl:flex-row gap-12">
          
          {/* 1. Control + Selection Feedback */}
          <div className="xl:w-1/3 xl:border-r border-zinc-50 dark:border-zinc-800 xl:pr-12 space-y-8">
             
             {/* Mode Switcher */}
             <div className="space-y-3">
               <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                 <Filter className="w-3.5 h-3.5" /> Perspective Mode
               </div>
               <div className="flex bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-700 w-fit">
                  <button onClick={() => { setMode('month'); setEndMonth(startMonth); }} className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${mode === 'month' ? 'bg-zinc-900 shadow-md text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>SINGLE</button>
                  <button onClick={() => setMode('range')} className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${mode === 'range' ? 'bg-zinc-900 shadow-md text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>RANGE</button>
                  <button onClick={() => setMode('all')} className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all ${mode === 'all' ? 'bg-zinc-900 shadow-md text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>ALL TIME</button>
               </div>
             </div>

             {/* Date channel selectors — hidden in All Time mode */}
             {mode !== 'all' && (
               <div className="flex flex-col gap-3">
                 <button onClick={() => setSelecting('start')} className={`p-5 rounded-2xl border transition-all text-left ${selecting === 'start' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}>
                   <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight mb-2 font-mono">Channel A (Start)</div>
                   <div className={`text-xl font-black ${selecting === 'start' ? 'text-amber-800' : 'text-zinc-900'}`}>{new Date(startMonth + '-01T12:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                 </button>
                 {mode === 'range' && (
                   <button onClick={() => setSelecting('end')} className={`p-5 rounded-2xl border transition-all text-left ${selecting === 'end' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}>
                     <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight mb-2 font-mono">Channel B (End)</div>
                     <div className={`text-xl font-black ${selecting === 'end' ? 'text-amber-800' : 'text-zinc-900'}`}>{new Date(endMonth + '-01T12:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                   </button>
                 )}
               </div>
             )}

             {/* All Time summary label */}
             {mode === 'all' && (
               <div className="p-5 rounded-2xl border border-zinc-100 bg-zinc-50">
                 <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight mb-2">Coverage</div>
                 <div className="text-xl font-black text-zinc-900">All {availableMonths.length} Months</div>
                 <div className="text-xs text-zinc-400 font-medium mt-1">Full historical dataset</div>
               </div>
             )}
          </div>

          {/* 2. Interactive Matrix Selector — hidden in All Time mode */}
          {mode !== 'all' && (
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide border-b border-zinc-50 dark:border-zinc-800">
                {Array.from(new Set(availableMonths.map(m => m.split('-')[0]))).sort((a,b) => b.localeCompare(a)).map(year => (
                  <button key={year} onClick={() => setViewingYear(year)} className={`px-6 py-3 rounded-2xl text-xs font-black transition-all ${viewingYear === year ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'text-zinc-400 hover:text-zinc-900'}`}>
                    {year}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(mm => {
                  const target = `${viewingYear}-${mm}`;
                  const exists = availableMonths.includes(target);
                  const isSelected = startMonth === target || endMonth === target;
                  const isInRange = mode === 'range' && target > (startMonth < endMonth ? startMonth : endMonth) && target < (startMonth < endMonth ? endMonth : startMonth);
                  
                  return (
                    <button
                      key={mm}
                      disabled={!exists}
                      onClick={() => {
                        if (selecting === 'start') {
                          setStartMonth(target);
                          if (mode === 'month') setEndMonth(target);
                          if (mode === 'range') setSelecting('end');
                        } else setEndMonth(target);
                      }}
                      className={`h-24 flex flex-col items-center justify-center rounded-2xl border transition-all ${!exists ? 'opacity-[0.03] cursor-not-allowed border-transparent shadow-none' : isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-2xl scale-110 z-10' : isInRange ? 'bg-amber-100 border-amber-200 text-amber-900' : 'bg-zinc-50 border-zinc-100 text-zinc-900 hover:border-zinc-400'}`}
                    >
                      <div className="text-sm font-black uppercase tracking-tighter">{new Date(2000, parseInt(mm)-1).toLocaleString('default', { month: 'short' })}</div>
                      <div className={`text-[9px] font-black mt-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>{viewingYear}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 text-white rounded-[44px] p-12 shadow-2xl space-y-12">
        {/* Row 1: Primary Intelligence */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">
                {mode === 'all' ? 'All-Time Profit Performance' : multiplier > 1 ? `${multiplier}-Month Analysis` : 'Monthly Performance'}
              </div>
            </div>
            <div className={`font-black tracking-tighter leading-none ${(targetRevenue - totalCost).toString().length > 9 ? 'text-6xl' : 'text-8xl'}`}>
               {fmt(targetRevenue - totalCost)}
            </div>
            <div className="text-sm font-medium text-zinc-500 mt-6 max-w-xl italic">
               The net gap between overall projected community revenue and logged operational expenditure.
            </div>
          </div>
          
          <div className="w-full md:w-auto flex items-center gap-6">
            <div className="text-right">
              <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Efficiency Score</div>
              <div className={`text-3xl font-black ${ targetRevenue > 0 && ((targetRevenue - totalCost) / targetRevenue) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {targetRevenue > 0 ? (( (targetRevenue - totalCost) / targetRevenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Scalable Drilldown (Full Width) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-zinc-800">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Projected Target Revenue</div>
              <div className="text-3xl font-black tracking-tighter text-white">{fmt(targetRevenue)}</div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-amber-400 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logged Operational Overhead</div>
              <div className="text-3xl font-black tracking-tighter text-red-500">{fmt(totalCost)}</div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-red-500" style={{ width: targetRevenue > 0 ? `${Math.min(100, (totalCost / targetRevenue) * 100)}%` : '0%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Portfolio Pulse Row */}
      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-100 dark:border-zinc-800 p-8 grid grid-cols-1 md:grid-cols-2 gap-10 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Profit Pulse: Top Yield</h4>
          </div>
          <div className="space-y-3">
             {topYield.length === 0 ? <div className="text-sm text-zinc-500 italic">Finding top performers...</div> : topYield.map(y => (
               <button
                 key={y.id}
                 onClick={() => setSelectedCommunityId(y.id)}
                 className="flex items-center justify-between p-4 w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl hover:bg-emerald-100 transition-colors text-left"
               >
                 <div className="text-sm font-bold text-emerald-900">{y.name}</div>
                 <div className="text-xs font-black text-emerald-600">+{y.margin.toFixed(0)}% Margin</div>
               </button>
             ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-red-500" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Profit Pulse: Critical Yield</h4>
          </div>
          <div className="space-y-3">
             {lowYield.length === 0 ? <div className="text-sm text-zinc-500 italic">No critical alerts for this period.</div> : lowYield.map(y => (
               <button
                 key={y.id}
                 onClick={() => setSelectedCommunityId(y.id)}
                 className="flex items-center justify-between p-4 w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl hover:bg-red-100 transition-colors text-left"
               >
                 <div className="text-sm font-bold text-zinc-900 dark:text-white">{y.name}</div>
                 <div className="text-xs font-black text-red-500">{y.margin.toFixed(0)}% Margin</div>
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* 3. KPI Intelligence Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <DashCard label="Labor Cost" value={fmt(totalLaborCost)} sub={`@ $${laborRate.toFixed(2)}/hr`} icon={<HardHat className="w-5 h-5" />} color="orange" />
        <DashCard label="Material Cost" value={fmt(totalMaterialCost)} sub="Usage Log" icon={<Package className="w-5 h-5" />} color="purple" />
        <DashCard label="Field Visits" value={totalServiceVisits.toLocaleString()} sub="Verified Logs" icon={<Activity className="w-5 h-5" />} color="red" />
        <DashCard label="Avg Overhead" value={`$${avgCostPerVisit.toFixed(0)}`} sub="Per Service" icon={<TrendingUp className="w-5 h-5" />} color="blue" />
      </div>

      {/* 4. Deep Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Overhead Utilization Split</div>
          <div className="flex gap-10 mb-8">
            <div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white">{fmt(totalLaborCost)}</div>
              <div className="text-xs text-zinc-400 font-bold mt-1 uppercase">Labor ({totalCost > 0 ? ((totalLaborCost / totalCost) * 100).toFixed(1) : 0}%)</div>
            </div>
            <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
            <div>
              <div className="text-3xl font-black text-zinc-900 dark:text-white">{fmt(totalMaterialCost)}</div>
              <div className="text-xs text-zinc-400 font-bold mt-1 uppercase">Materials ({totalCost > 0 ? ((totalMaterialCost / totalCost) * 100).toFixed(1) : 0}%)</div>
            </div>
          </div>
          <div className="h-4 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
            <div style={{ width: totalCost > 0 ? `${(totalLaborCost / totalCost) * 100}%` : '0%' }} className="bg-zinc-900 h-full" />
            <div style={{ width: totalCost > 0 ? `${(totalMaterialCost / totalCost) * 100}%` : '0%' }} className="bg-amber-400 h-full" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8">
          <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Material Velocity</div>
          {topSkus.length === 0 ? (
            <div className="text-sm text-zinc-500 italic">No usage detected.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {topSkus.map(([sku, qty]: [string, number]) => {
                const max = (topSkus[0][1] as number) || 1;
                return (
                  <div key={sku} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{sku}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{qty.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${(qty / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-10 border-t border-zinc-50 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6">
          <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">Community Portfolio</h3>
          <div className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{communities.length} Entries</div>
        </div>
        <ManagementTable initialData={communities} yields={allYields} onSelectCommunity={setSelectedCommunityId} />
      </div>

      <CommunityDrawer
        communityId={selectedCommunityId}
        onClose={() => setSelectedCommunityId(null)}
      />
    </div>
  );
}

function DashCard({ label, value, sub, icon, color }: any) {
  const colorMap: any = {
    orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-200' },
    red:    { bg: 'bg-red-50 dark:bg-red-500/10',     text: 'text-red-600',    border: 'border-red-200' },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-500/10',   text: 'text-blue-600',   border: 'border-blue-200' },
  };
  const c = colorMap[color] || colorMap.blue;
  const isLarge = value.length > 11;

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-zinc-50 dark:border-zinc-800 shadow-sm flex flex-col min-h-[200px]">
      <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center ${c.text} mb-auto`}>{icon}</div>
      <div className={`font-black tracking-tighter text-zinc-900 dark:text-white mb-2 ${isLarge ? 'text-3xl mt-4' : 'text-4xl'}`}>{value}</div>
      <div>
        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-xs text-zinc-400 font-medium">{sub}</div>
      </div>
    </div>
  );
}
