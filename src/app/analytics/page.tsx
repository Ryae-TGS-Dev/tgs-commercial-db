'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { DashboardCharts } from "@/components/DashboardCharts";
import { useData } from "@/context/DataContext";
import { useUser } from "@/hooks/useUser";
import { getCompanyCurrentMonth, getCompanyToday } from "@/lib/date-utils";
import { 
  BarChart3, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target,
  DollarSign,
  Filter,
  Loader2,
  Activity,
  Edit2,
  Check,
  X,
  ChevronDown,
  Calendar,
  Info
} from "lucide-react";
import { Tooltip } from '@/components/Tooltip';

export default function AnalyticsPage() {
  const { communities, services, laborRate, efficiencyTarget, patchSettings, loading } = useData();
  const { profile } = useUser();
  const canEditBaseline = profile?.role?.can_manage_system || false;
  
  const [mode, setMode] = useState<'month' | 'range' | 'all'>('month');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [viewingYear, setViewingYear] = useState<string>(getCompanyToday().substring(0, 4));
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (services.length > 0) {
      const months = Array.from(new Set(services.map(s => s.service_date.substring(0, 7))));
      months.sort((a, b) => b.localeCompare(a));
      setAvailableMonths(months);
      
      if (!startMonth) {
        const currentMonth = getCompanyCurrentMonth();
        setStartMonth(currentMonth);
        setEndMonth(currentMonth);
      }
    }
  }, [services, startMonth]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sortedMonths = useMemo(() => {
    if (!startMonth || !endMonth) return [startMonth, endMonth];
    return [startMonth, endMonth].sort();
  }, [startMonth, endMonth]);

  const stats = useMemo(() => {
    if (!startMonth || !endMonth || communities.length === 0) return null;

    const rangeStart = sortedMonths[0];
    const rangeEnd = sortedMonths[1];

    // --- Pre-build O(1) community lookup map ---
    const communityMap = new Map<string, any>();
    communities.forEach(c => communityMap.set(c.id, c));

    // --- Determine the 4 trend months up-front ---
    const trendMonths: string[] = [];
    const lastDate = mode === 'all' ? availableMonths[0] : rangeEnd;
    if (lastDate) {
      const d = new Date(lastDate + '-01T12:00:00');
      for (let i = 3; i >= 0; i--) {
        const temp = new Date(d);
        temp.setMonth(d.getMonth() - i);
        trendMonths.push(temp.toISOString().substring(0, 7));
      }
    }
    const trendMonthSet = new Set(trendMonths);

    // --- Single pass over all services ---
    let totalLabor = 0;
    let totalMaterial = 0;
    const activeCommunityMonths = new Set<string>();
    const yieldMap: Record<string, { revenue: number; cost: number }> = {};

    // Trend accumulators keyed by month
    const trendAccum: Record<string, { laborCost: number; materialCost: number; activeCommunityIds: Set<string> }> = {};
    trendMonths.forEach(m => {
      trendAccum[m] = { laborCost: 0, materialCost: 0, activeCommunityIds: new Set() };
    });

    services.forEach(s => {
      const sMonth = s.service_date.substring(0, 7);
      const inRange = mode === 'all' || (sMonth >= rangeStart && sMonth <= rangeEnd);

      // --- Accumulate for period totals & yieldMap ---
      if (inRange && s.community_id) {
        activeCommunityMonths.add(`${s.community_id}_${sMonth}`);

        const rate = s.applied_labor_rate || laborRate;
        const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * rate;
        let matCost = 0;
        s.service_product_usage?.forEach((u: any) => {
          matCost += (u.quantity_used || 0) * (u.applied_unit_price || u.products?.unit_price || 0);
        });

        totalLabor += laborCost;
        totalMaterial += matCost;

        if (!yieldMap[s.community_id]) yieldMap[s.community_id] = { revenue: 0, cost: 0 };
        yieldMap[s.community_id].cost += laborCost + matCost;
      }

      // --- Accumulate for trend chart (independent of range filter) ---
      if (trendMonthSet.has(sMonth)) {
        const acc = trendAccum[sMonth];
        const rate = s.applied_labor_rate || laborRate;
        acc.laborCost += (s.total_labor_hours_num || 0) * (s.crew_count || 1) * rate;
        s.service_product_usage?.forEach((u: any) => {
          acc.materialCost += (u.quantity_used || 0) * (u.applied_unit_price || u.products?.unit_price || 0);
        });
        if (s.community_id) acc.activeCommunityIds.add(s.community_id);
      }
    });

    // --- Derive period revenue using O(1) map lookups ---
    let periodRevenue = 0;
    activeCommunityMonths.forEach(key => {
      const commId = key.split('_')[0];
      const c = communityMap.get(commId);
      if (c) periodRevenue += (c.total_monthly_price || 0);
    });

    // --- Build yieldMap revenues using O(1) map lookups ---
    activeCommunityMonths.forEach(key => {
      const commId = key.split('_')[0];
      if (yieldMap[commId]) {
        const c = communityMap.get(commId);
        if (c) yieldMap[commId].revenue += (c.total_monthly_price || 0);
      }
    });

    // --- Build trend data from pre-accumulated buckets ---
    const trendData = trendMonths.map(m => {
      const acc = trendAccum[m];
      const mRev = Array.from(acc.activeCommunityIds).reduce((sum, id) => {
        const c = communityMap.get(id);
        return sum + (c?.total_monthly_price || 0);
      }, 0);
      const d = new Date(m + '-01T12:00:00');
      return {
        date: d.toLocaleString('default', { month: 'short' }),
        revenue: mRev || periodRevenue / (mode === 'all' ? availableMonths.length : 1),
        laborCost: acc.laborCost,
        materialCost: acc.materialCost,
      };
    });

    // --- Build community leaderboard ---
    const communityComparison = Object.entries(yieldMap).map(([id, data]) => {
      const comm = communityMap.get(id);
      if (comm?.status !== 'Active') return null;
      const marginPct = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
      return { id, name: comm.name, marginPct };
    }).filter(Boolean) as any[];

    const totalCost = totalLabor + totalMaterial;
    const netProfit = periodRevenue - totalCost;
    const margin = periodRevenue > 0 ? (netProfit / periodRevenue) * 100 : 0;

    return {
      periodRevenue,
      netProfit,
      margin,
      totalLabor,
      totalMaterial,
      totalCost,
      trendData,
      communityComparison: communityComparison.sort((a, b) => b.marginPct - a.marginPct),
    };
  }, [communities, services, mode, laborRate, availableMonths, sortedMonths]);


  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtFull = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <Loader2 size={40} className="animate-spin text-zinc-900" />
      </div>
    );
  }

  const { periodRevenue, netProfit, margin, totalLabor, totalMaterial, totalCost, trendData, communityComparison } = stats;

  const allocationData = [
    { name: 'Labor Overhead', value: totalLabor, color: '#18181b' },
    { name: 'Material Burn', value: totalMaterial, color: '#f59e0b' },
  ];

  const dateLabel = mode === 'all' 
    ? "All Time Portfolio History" 
    : mode === 'month' 
    ? new Date(startMonth + '-01T12:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })
    : `${new Date(sortedMonths[0] + '-01T12:00:00').toLocaleString('default', { month: 'short', year: 'numeric' })} - ${new Date(sortedMonths[1] + '-01T12:00:00').toLocaleString('default', { month: 'short', year: 'numeric' })}`;

  return (
    <div style={{ padding: "24px 40px", maxWidth: 1600, margin: "0 auto" }}>
      
      {/* Header - Compact */}
      <div className="fade-up" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 10000 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ background: '#18181b', padding: 8, borderRadius: 10, color: 'white' }}>
               <BarChart3 size={18} />
             </div>
             <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>Portfolio Analytics</h1>
          </div>
        </div>

        {/* Date Filter Trigger */}
        <div className="relative z-[9999]" ref={filterRef}>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="group flex items-center gap-3 px-5 py-3 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-900 transition-all shadow-sm"
          >
            <div className="bg-zinc-100 p-1.5 rounded-lg group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              <Calendar size={14} />
            </div>
            <div className="text-left">
              <div className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Month Selection</div>
              <div className="text-xs font-black text-zinc-900 flex items-center gap-2">
                {dateLabel}
                <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </button>

          {/* Floating Date Matrix Popover */}
          {isFilterOpen && (
            <div className="absolute top-full right-0 mt-3 z-[999] w-[420px] bg-white border border-zinc-200 rounded-[32px] shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
               <div className="space-y-6">
                  {/* Mode Selector */}
                  <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">1. Select Range Mode</div>
                    <div className="bg-zinc-100 p-1 rounded-2xl flex gap-1">
                      <button onClick={() => { setMode('month'); setEndMonth(startMonth); }} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${mode === 'month' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>SINGLE MONTH</button>
                      <button onClick={() => { setMode('range'); setStartMonth(''); setEndMonth(''); setSelecting('start'); }} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${mode === 'range' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>CUSTOM RANGE</button>
                      <button onClick={() => setMode('all')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${mode === 'all' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}>ALL TIME</button>
                    </div>
                  </div>

                  {/* Year Switcher */}
                  <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">2. Navigate Years</div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      {Array.from(new Set(availableMonths.map(m => m.split('-')[0]))).sort((a,b) => b.localeCompare(a)).map(year => (
                        <button key={year} onClick={() => setViewingYear(year)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${viewingYear === year ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-50 text-zinc-400 hover:text-zinc-900'}`}>{year}</button>
                      ))}
                    </div>
                  </div>

                  {/* Month Grid */}
                  <div className="flex flex-col gap-4">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">3. Pick Selection ({selecting === 'start' ? 'Start' : 'End'})</div>
                    <div className="grid grid-cols-4 gap-2">
                       {['01','02','03','04','05','06','07','08','09','10','11','12'].map(mm => {
                          const target = `${viewingYear}-${mm}`;
                          const exists = availableMonths.includes(target);
                          const isSelected = startMonth === target || endMonth === target;
                          const isInRange = mode === 'range' && startMonth && endMonth && target > sortedMonths[0] && target < sortedMonths[1];
                          
                          return (
                            <button
                              key={mm}
                              disabled={!exists}
                              onClick={() => {
                                if (mode === 'all') setMode('month');
                                if (selecting === 'start') {
                                  setStartMonth(target);
                                  if (mode === 'month') {
                                    setEndMonth(target);
                                    setIsFilterOpen(false);
                                  } else setSelecting('end');
                                } else {
                                  // Complete the range and auto-sort
                                  const ds = [startMonth, target].sort();
                                  setStartMonth(ds[0]);
                                  setEndMonth(ds[1]);
                                  setIsFilterOpen(false);
                                  setSelecting('start');
                                }
                              }}
                              className={`h-11 flex flex-col items-center justify-center rounded-xl border transition-all ${!exists ? 'opacity-10 grayscale cursor-not-allowed' : isSelected ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg scale-105 z-10' : isInRange ? 'bg-amber-100 border-amber-200 text-amber-900' : 'bg-white border-zinc-100 text-zinc-900 hover:border-zinc-300'}`}
                            >
                              <div className="text-[10px] font-black uppercase text-center">{new Date(2000, parseInt(mm)-1).toLocaleString('default', { month: 'short' })}</div>
                            </button>
                          );
                       })}
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Primary Intelligence Pulse - Ultra-Compact */}
      <div className="fade-up bg-[#09090b] text-white rounded-[32px] p-8 shadow-xl mb-6 space-y-6 border border-zinc-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`w-4 h-4 ${margin > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              <div className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">Net Profit</div>
            </div>
            <div className="text-5xl font-black tracking-tighter leading-none">{fmtFull(netProfit)}</div>
            <div className="text-[13px] font-medium text-zinc-300 mt-2 max-w-xl">Total earnings after labor and material expenses.</div>
          </div>
          <div className="text-right">
             <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Efficiency Score</div>
             <div className={`text-4xl font-black ${margin >= efficiencyTarget ? 'text-emerald-500' : margin > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
               {margin.toFixed(1)}%
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-zinc-800/50">
           <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Revenue Target</div>
                <div className="text-xl font-black tracking-tighter text-white">{fmtFull(periodRevenue)}</div>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 w-full" />
              </div>
           </div>
           <div className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Expenditure</div>
                <div className={`text-xl font-black tracking-tighter ${margin > 0 ? 'text-white' : 'text-rose-500'}`}>{fmtFull(totalCost)}</div>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div className={`h-full ${margin > efficiencyTarget ? 'bg-zinc-600' : 'bg-rose-500'}`} style={{ width: periodRevenue > 0 ? `${Math.min(100, (totalCost / periodRevenue) * 100)}%` : '0%' }} />
              </div>
           </div>
        </div>
      </div>

      {/* High Contrast Cards - Small & Tight */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 fade-up" style={{ marginBottom: 32 }}>
        <DashCard 
          title="Portfolio Status" 
          value={fmt(periodRevenue)} 
          sub="Projected MRR" 
          icon={<DollarSign size={14} />} 
          color="zinc"
          tooltip="This is the total monthly revenue expected from all active community contracts."
        />
        <DashCard 
          title="Profit Trajectory" 
          value={fmt(netProfit)} 
          sub={margin >= efficiencyTarget ? "Exceeding Target" : margin > 0 ? "Above Break-even" : "Loss Exposure"}
          icon={margin >= efficiencyTarget ? <ArrowUpRight size={14} color="#10b981" /> : margin > 0 ? <Activity size={14} color="#f59e0b" /> : <ArrowDownRight size={14} color="#f43f5e" />}
          trend={`${margin.toFixed(1)}%`}
          trendColor={margin >= efficiencyTarget ? "#10b981" : margin > 0 ? "#f59e0b" : "#f43f5e"}
          tooltip="Shows if you are currently reaching your profit target after labor and material expenses."
        />
        <DashCard 
          title="Operational Burn" 
          value={fmt(totalCost)} 
          sub="Combined Overhead" 
          icon={<TrendingUp size={14} />} 
          color="zinc"
          tooltip="The total cost of keeping the business running (Labor Cost + Material Cost)."
        />
        <DashCard 
          title="Performance Goal" 
          value={`${efficiencyTarget.toFixed(1)}%`} 
          sub="Efficiency Baseline" 
          icon={<Target size={14} />} 
          color="amber"
          tooltip="Your preset target for product usage. Hitting this counts as a 'Bullseye'."
        />
      </div>

      <div className="fade-up">
        <DashboardCharts 
          trendData={trendData}
          communityData={communityComparison}
          allocationData={allocationData}
          efficiencyTarget={efficiencyTarget}
        />
      </div>
    </div>
  );
}

function DashCard({ title, value, sub, icon, trend, trendColor, color, isEditable, onSave, tooltip }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.replace('%', ''));
  const bg = color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white border-zinc-100';

  const handleSave = () => {
    onSave?.(tempValue);
    setIsEditing(false);
  };

  return (
    <div className={`px-5 py-4 rounded-[24px] border ${bg} shadow-sm flex flex-col gap-4 relative group`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div style={{ fontSize: 11, fontWeight: 900, color: '#18181b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
          {tooltip && (
            <Tooltip content={tooltip}>
              <Info size={12} className="text-amber-500 hover:text-amber-400 transition-colors cursor-help" />
            </Tooltip>
          )}
        </div>
        <div style={{ color: '#71717a' }}>
           {isEditable && !isEditing && (
             <button onClick={() => setIsEditing(true)} className="w-5 h-5 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all opacity-0 group-hover:opacity-100">
               <Edit2 size={10} />
             </button>
           )}
           {!isEditing && icon}
        </div>
      </div>
      <div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={tempValue} 
              onChange={e => setTempValue(e.target.value)}
              className="w-full text-xl font-black tracking-tighter border-b border-zinc-900 outline-none bg-transparent"
              autoFocus
            />
            <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={14} /></button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg"><X size={14} /></button>
          </div>
        ) : (
          <div style={{ fontSize: 24, fontWeight: 900, color: '#18181b', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span style={{ fontSize: 12, fontWeight: 700, color: '#71717a' }}>{sub}</span>
          {trend && <span style={{ fontSize: 12, fontWeight: 900, color: trendColor }}>{trend}</span>}
        </div>
      </div>
    </div>
  );
}
