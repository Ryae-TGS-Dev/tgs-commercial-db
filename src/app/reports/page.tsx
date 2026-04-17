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
  ChevronUp,
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

// Sub-components moved outside to prevent recreation
const SortIcon = ({ ik, currentSortKey, currentSortOrder, align = 'left' }: { ik: string, currentSortKey: string, currentSortOrder: 'asc' | 'desc', align?: 'left' | 'right' }) => {
  const icon = currentSortOrder === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  const isActive = currentSortKey === ik;
  
  if (align === 'right') {
    return (
      <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', opacity: isActive ? 1 : 0.1 }}>
        {icon}
      </div>
    );
  }
  
  return (
    <span className={`ml-1 ${isActive ? 'text-zinc-900' : 'opacity-10'}`}>
      {isActive ? icon : <ChevronDown size={10} />}
    </span>
  );
};

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
        <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl mt-1 max-h-[200px] overflow-y-auto z-50 shadow-xl p-1">
          {available.map((o:any) => (
            <div key={o.value} onClick={() => toggle(o.value)} className="p-2 text-xs font-bold hover:bg-zinc-50 rounded-lg cursor-pointer">{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Debounced Filter States (The actual values used for calculation)
  const [dDateFrom, setDDateFrom] = useState('');
  const [dDateTo, setDDateTo] = useState('');
  const [dMinPrice, setDMinPrice] = useState('');
  const [dMaxPrice, setDMaxPrice] = useState('');
  const [dMinLabor, setDMinLabor] = useState('');
  const [dMinMaterial, setDMinMaterial] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDDateFrom(dateFrom); setDDateTo(dateTo); setDMinPrice(minPrice); setDMaxPrice(maxPrice);
      setDMinLabor(minLabor); setDMinMaterial(minMaterial);
    }, 400);
    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, minPrice, maxPrice, minLabor, minMaterial]);

  const [activeTab, setActiveTab] = useState<'raw' | 'monthly' | 'financial'>('financial');
  const [selectedCommunityForDrawer, setSelectedCommunityForDrawer] = useState<string | null>(null);
  const [precisionFilter, setPrecisionFilter] = useState<'all' | 'waste' | 'bullseye' | 'low-coverage'>('all');
  
  // Sorting State
  const [sortKey, setSortKey] = useState<string>('netProfit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Financial Intelligence State
  const [finSettings, setFinSettings] = useState({
    overhead_percentage: 20,
    profit_danger_threshold: 10,
    profit_breakeven_threshold: 50
  });

  useEffect(() => {
    // Force the document body to hide overflow while on this page
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  useEffect(() => {
    async function loadFinSettings() {
      const { data } = await supabase.from('financial_settings').select('key, value');
      if (data) {
        const map = Object.fromEntries(data.map(s => [s.key, s.value]));
        setFinSettings({
          overhead_percentage: parseFloat(map.overhead_percentage) || 20,
          profit_danger_threshold: parseFloat(map.profit_danger_threshold) || 10,
          profit_breakeven_threshold: parseFloat(map.profit_breakeven_threshold) || 50
        });
      }
    }
    loadFinSettings();
  }, []);

  const formatMonth = (mKey: string) => {
    if (!mKey) return '';
    const [y, m] = mKey.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  // Compute filtered dataset with O(1) lookups and memory optimization
  const filteredData = useMemo(() => {
    // Index communities for O(1) lookup
    const commMap = new Map(communities.map(c => [c.id, c]));
    
    let filtered = services;

    if (dDateFrom) filtered = filtered.filter(s => s.service_date >= dDateFrom);
    if (dDateTo) filtered = filtered.filter(s => s.service_date <= dDateTo);
    
    if (selectedCommunities.length > 0) {
      const commSet = new Set(selectedCommunities);
      filtered = filtered.filter(s => s.community_id && commSet.has(s.community_id));
    }
    if (selectedCompanies.length > 0) {
      const compSet = new Set(selectedCompanies);
      filtered = filtered.filter(s => {
        if (!s.community_id) return false;
        const comm = commMap.get(s.community_id);
        return comm && compSet.has(comm.company);
      });
    }

    if (selectedProducts.length > 0) {
      const matchSet = new Set(selectedProducts);
      if (productLogic === 'AND') {
        filtered = filtered.filter(s => {
          const usedSkus = new Set(s.service_product_usage.map(u => u.products?.sku).filter(Boolean));
          return selectedProducts.every(p => usedSkus.has(p));
        });
      } else {
        filtered = filtered.filter(s => {
          return s.service_product_usage.some(u => u.products?.sku && matchSet.has(u.products.sku));
        });
      }
    }

    // Sort Raw Data if in raw tab
    if (activeTab === 'raw') {
      filtered = [...filtered].sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        if (sortKey === 'service_date') return factor * a.service_date.localeCompare(b.service_date);
        if (sortKey === 'source_community_name') return factor * a.source_community_name.localeCompare(b.source_community_name);
        if (sortKey === 'crew_leader') return factor * a.crew_leader.localeCompare(b.crew_leader);
        if (sortKey === 'service_performed') return factor * a.service_performed.localeCompare(b.service_performed);
        if (sortKey === 'totalBurn') {
          const getBurn = (s: any) => {
            const laborRateToUse = s.applied_labor_rate || laborRate;
            const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRateToUse;
            let matCost = 0;
            s.service_product_usage.forEach((u: any) => {
              matCost += (u.quantity_used || 0) * (u.applied_unit_price || u.products?.unit_price || 0);
            });
            return laborCost + matCost;
          };
          return factor * (getBurn(a) - getBurn(b));
        }
        return 0;
      });
    }

    const monthlyGroups: Record<string, any> = {};

    filtered.forEach(s => {
      if (!s.community_id) return;
      const m = s.service_date.substring(0, 7);
      const key = `${s.community_id}_${m}`;
      const comm = commMap.get(s.community_id);
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
      if (dMinPrice && g.monthlyPrice < parseFloat(dMinPrice)) return false;
      if (dMaxPrice && g.monthlyPrice > parseFloat(dMaxPrice)) return false;
      if (dMinMaterial && g.totalMaterialCost < parseFloat(dMinMaterial)) return false;
      if (dMaxPrice && g.totalMaterialCost > parseFloat(dMaxPrice)) return false; // Note: using dMaxPrice logic as per previous structure check
      if (dMinLabor && g.totalLaborCost < parseFloat(dMinLabor)) return false;
      if (dMaxPrice && g.totalLaborCost > parseFloat(dMaxPrice)) return false;
      return true;
    }));

    const hasNumFilters = !!(dMinPrice || dMaxPrice || dMinMaterial || dMinLabor);
    
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
        
        // Financial Intelligence Logic
        const overheadCost = g.monthlyPrice * (finSettings.overhead_percentage / 100);
        const netProfit = g.monthlyPrice - g.totalLaborCost - g.totalMaterialCost - overheadCost;
        const netMargin = g.monthlyPrice > 0 ? (netProfit / g.monthlyPrice) * 100 : 0;
        
        let healthIcon = 'success';
        if (netMargin < finSettings.profit_danger_threshold) healthIcon = 'danger';
        else if (netMargin < finSettings.profit_breakeven_threshold) healthIcon = 'neutral';

        return { 
          ...g, 
          avgEff, 
          formattedMonth: formatMonth(g.monthKey),
          overheadCost,
          netProfit,
          netMargin,
          healthIcon
        };
      })
      .filter(g => {
        if (precisionFilter === 'all') return true;
        if (g.avgEff === null) return false;
        if (precisionFilter === 'waste') return g.avgEff < 90;
        if (precisionFilter === 'bullseye') return g.avgEff >= 90 && g.avgEff <= 110;
        if (precisionFilter === 'low-coverage') return g.avgEff > 110;
        return true;
      })
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        if (sortKey === 'commName') return factor * a.commName.localeCompare(b.commName);
        if (sortKey === 'monthlyPrice' || sortKey === 'monthlyPrice_agg') return factor * (a.monthlyPrice - b.monthlyPrice);
        if (sortKey === 'netProfit') return factor * (a.netProfit - b.netProfit);
        if (sortKey === 'netMargin') return factor * (a.netMargin - b.netMargin);
        if (sortKey === 'totalLaborCost') return factor * (a.totalLaborCost - b.totalLaborCost);
        if (sortKey === 'totalMaterialCost') return factor * (a.totalMaterialCost - b.totalMaterialCost);
        if (sortKey === 'overheadCost') return factor * (a.overheadCost - b.overheadCost);
        if (sortKey === 'monthKey') return factor * a.monthKey.localeCompare(b.monthKey);
        if (sortKey === 'avgEff') return factor * (a.avgEff - b.avgEff);
        if (sortKey === 'visits') return factor * (a.services.length - b.services.length);
        return b.monthKey.localeCompare(a.monthKey) || a.commName.localeCompare(b.commName);
      });

    return { raw: filtered, monthly: finalMonthlyGroups };
  }, [services, communities, dDateFrom, dDateTo, selectedCommunities, selectedCompanies, selectedProducts, productLogic, dMinPrice, dMaxPrice, dMinMaterial, dMinLabor, laborRate, precisionFilter, sortKey, sortOrder, finSettings, activeTab]);

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

  const fmtFull = (n: number) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string, type: 'month' | 'day' = 'day') => {
    if (!dateStr) return '';
    const date = new Date(dateStr + (type === 'month' ? '-02' : 'T12:00:00'));
    const options: any = type === 'month' 
      ? { month: 'long', year: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options).toUpperCase();
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

// SortIcon logic removed from here (now outside)

  const exportCSV = () => {
    let csvStr = '';
    const timestamp = new Date().toISOString().split('T')[0];
    let filename = `tgs_report_${timestamp}.csv`;

    if (activeTab === 'financial') {
      filename = `tgs_financial_intelligence_${timestamp}.csv`;
      csvStr = 'Community,Month,Revenue,Overhead,Labor,Materials,Net Profit,Margin %\n';
      filteredData.monthly.forEach(g => {
        csvStr += `"${g.commName}","${g.monthKey}",${g.monthlyPrice.toFixed(2)},${g.overheadCost.toFixed(2)},${g.totalLaborCost.toFixed(2)},${g.totalMaterialCost.toFixed(2)},${g.netProfit.toFixed(2)},${g.netMargin.toFixed(1)}%\n`;
      });
    } else if (activeTab === 'monthly') {
      filename = `tgs_monthly_aggregates_${timestamp}.csv`;
      csvStr = 'Month,Community,Monthly Contract Value,Total Labor Cost,Total Material Cost,Precision %,Visits\n';
      filteredData.monthly.forEach(g => {
        csvStr += `"${g.monthKey}","${g.commName}",${g.monthlyPrice.toFixed(2)},${g.totalLaborCost.toFixed(2)},${g.totalMaterialCost.toFixed(2)},${(g.avgEff || 0).toFixed(1)}%,${g.services.length}\n`;
      });
    } else {
      filename = `tgs_service_records_${timestamp}.csv`;
      csvStr = 'Date,Community,Service Performed,Crew Leader,Materials Used,Total Burn ($)\n';
      filteredData.raw.forEach(s => {
        const laborRateToUse = s.applied_labor_rate || laborRate;
        const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRateToUse;
        const matCost = s.service_product_usage.reduce((sum, u) => {
          const productPrice = u.applied_unit_price || u.products?.unit_price || 0;
          return sum + (u.quantity_used || 0) * productPrice;
        }, 0);
        const mats = s.service_product_usage.map(u => `${u.products?.sku || 'Unknown'} (${u.quantity_used})`).join('; ');
        const totalBurn = laborCost + matCost;
        csvStr += `"${s.service_date}","${s.source_community_name}","${s.service_performed.replace(/"/g, '""')}","${s.crew_leader}","${mats}",${totalBurn.toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Audit Log the download
    supabase.from('audit_logs').insert({
      user_id: profile?.id,
      user_email: profile?.email,
      action: 'DOWNLOAD',
      metadata: {
        filename,
        tab: activeTab,
        record_count: activeTab === 'raw' ? filteredData.raw.length : filteredData.monthly.length,
        filters: { dateFrom, dateTo, selectedCommunities, selectedTypes }
      }
    }).then(({ error }) => {
      if (error) console.error('Failed to log download audit:', error);
    });
  };

  return (
    <div style={{ 
      height: 'calc(100vh - 52px)', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: "32px 40px 0 40px", 
      width: '100%', 
      maxWidth: 1600, 
      margin: "0 auto", 
      overflow: 'hidden' 
    }}>
      
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
        <div className="fade-up" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flex: 1, minHeight: 0, marginBottom: 40 }}>
          
          {/* Filters - High Density & Independently Scrollable */}
          <div style={{ width: 340, flexShrink: 0, height: '100%', overflowY: 'auto', paddingRight: 4 }}>
            <div className="card" style={{ padding: 24, borderRadius: 32, marginBottom: 20 }}>
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

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
            
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

            {/* Unified Command Bar - Dynamic Height Fitting */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: 32, overflow: 'hidden' }}>
              <div className="flex bg-zinc-100/50 p-1.5 gap-1.5 border-b border-zinc-100 flex-shrink-0">
                <button onClick={() => setActiveTab('financial')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all tracking-widest ${activeTab === 'financial' ? 'bg-white shadow-md border-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>FINANCIAL INTELLIGENCE</button>
                <button onClick={() => setActiveTab('monthly')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all tracking-widest ${activeTab === 'monthly' ? 'bg-white shadow-md border-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>MONTHLY AGGREGATES</button>
                <button onClick={() => setActiveTab('raw')} className={`flex-1 py-3 text-[10px] font-black rounded-2xl transition-all tracking-widest ${activeTab === 'raw' ? 'bg-white shadow-md border-2 border-zinc-900 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>SERVICE RECORDS</button>
              </div>
 
            {/* Table Container - Dynamic Height */}
            <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
              <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', minHeight: 0 }}>
                  <table className="tgs-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: 'white' }}>
                      <tr>
                        {activeTab === 'financial' ? (
                          <>
                              <th className="cursor-pointer" onClick={() => handleSort('commName')} style={{ padding: '14px 20px', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                                 <div className="flex items-center">COMMUNITY <SortIcon ik="commName" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                              </th>
                              <th style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('monthlyPrice')}>
                                 REVENUE <SortIcon ik="monthlyPrice" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                              </th>
                              <th style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('overheadCost')}>
                                 OVERHEAD <SortIcon ik="overheadCost" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                              </th>
                              <th style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('totalLaborCost')}>
                                 LABOR <SortIcon ik="totalLaborCost" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                              </th>
                              <th style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('totalMaterialCost')}>
                                 MATERIALS <SortIcon ik="totalMaterialCost" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                              </th>
                              <th style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('netProfit')}>
                                 NET PROFIT <SortIcon ik="netProfit" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                              </th>
                              <th style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('netMargin')}>
                                 MARGIN % <SortIcon ik="netMargin" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                              </th>
                          </>
                        ) : activeTab === 'monthly' ? (
                          <>
                            <th style={{ padding: '14px 20px', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap', width: '1%', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('monthKey')}>
                               <div className="flex items-center">MONTH <SortIcon ik="monthKey" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('commName')} style={{ color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               <div className="flex items-center">COMMUNITY <SortIcon ik="commName" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('monthlyPrice_agg')} style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               CONTRACT <SortIcon ik="monthlyPrice_agg" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('totalLaborCost')} style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               LABOR COST <SortIcon ik="totalLaborCost" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('totalMaterialCost')} style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               MATERIAL COST <SortIcon ik="totalMaterialCost" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('avgEff')} style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               PRECISION <SortIcon ik="avgEff" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('visits')} style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               VISITS <SortIcon ik="visits" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                            </th>
                          </>
                        ) : (
                          <>
                            <th style={{ padding: '14px 20px', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', whiteSpace: 'nowrap', width: '1%', borderBottom: '1px solid #f1f5f9', background: 'white' }} className="cursor-pointer" onClick={() => handleSort('service_date')}>
                               <div className="flex items-center">DATE <SortIcon ik="service_date" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('source_community_name')} style={{ color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', padding: '14px 20px', whiteSpace: 'nowrap', width: '1%', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               <div className="flex items-center">COMMUNITY <SortIcon ik="source_community_name" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('service_performed')} style={{ color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               <div className="flex items-center">SERVICE PERFORMED <SortIcon ik="service_performed" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('crew_leader')} style={{ color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'left', padding: '14px 20px', whiteSpace: 'nowrap', width: '1%', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               <div className="flex items-center">CREW LEADER <SortIcon ik="crew_leader" currentSortKey={sortKey} currentSortOrder={sortOrder} /></div>
                            </th>
                            <th className="cursor-pointer" onClick={() => handleSort('totalBurn')} style={{ textAlign: 'right', color: '#a1a1aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%', position: 'relative', borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                               BURN ($) <SortIcon ik="totalBurn" align="right" currentSortKey={sortKey} currentSortOrder={sortOrder} />
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                    {activeTab === 'financial' ? (
                      filteredData.monthly.map((g, i) => (
                        <tr key={i} className={g.netMargin < 0 ? 'bg-rose-50/20' : ''} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ verticalAlign: 'middle', padding: '14px 20px', textAlign: 'left' }}>
                            <div className="flex flex-col gap-0.5 items-start">
                              <button onClick={() => setSelectedCommunityForDrawer(g.communityId)} className="text-[13px] font-black text-zinc-900 hover:underline text-left leading-tight">{g.commName}</button>
                              <span style={{ fontSize: 9, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900 }}>{formatDate(g.monthKey, 'month')}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: 13, color: '#71717a', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>{fmtFull(g.monthlyPrice)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: 13, color: '#94a3b8', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>-{fmtFull(g.overheadCost)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: 13, color: '#f43f5e', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>-{fmtFull(g.totalLaborCost)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: 13, color: '#f59e0b', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>-{fmtFull(g.totalMaterialCost)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 900, fontSize: 14, color: g.netProfit > 0 ? '#10b981' : '#f43f5e', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>{fmtFull(g.netProfit)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>
                             <div className="flex justify-end">
                               <span style={{ fontSize: 11, fontWeight: 900, color: 'white', background: g.healthIcon === 'success' ? '#10b981' : g.healthIcon === 'danger' ? '#f43f5e' : '#f59e0b', padding: '2px 8px', borderRadius: 6 }}>
                                 {g.netMargin.toFixed(1)}%
                               </span>
                             </div>
                          </td>
                        </tr>
                      ))
                    ) : activeTab === 'monthly' ? (
                      filteredData.monthly.map((g, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'left', whiteSpace: 'nowrap', width: '1%' }}>
                            <span style={{ fontSize: 10, fontWeight: 900, color: '#71717a' }}>{formatDate(g.monthKey, 'month')}</span>
                          </td>
                          <td style={{ verticalAlign: 'middle', padding: '14px 20px', textAlign: 'left' }}>
                            <button onClick={() => setSelectedCommunityForDrawer(g.communityId)} className="text-[13px] font-black text-zinc-900 hover:underline">{g.commName}</button>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#71717a', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>{fmtFull(g.monthlyPrice)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>{fmtFull(g.totalLaborCost)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>{fmtFull(g.totalMaterialCost)}</td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '14px 36px 14px 20px', width: '1%' }}>
                             <div className="flex justify-end items-center gap-1.5 p-1 px-2.5 rounded-full bg-zinc-100/50 border border-zinc-200 w-fit ml-auto">
                               <div style={{ fontSize: 9, fontWeight: 900, color: '#18181b' }}>{(g.avgEff || 0).toFixed(1)}%</div>
                             </div>
                          </td>
                          <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '14px 36px 14px 20px', width: '1%' }}>
                             <div className="inline-flex items-center justify-center p-1.5 px-3 rounded-lg bg-zinc-50 border border-zinc-100 text-[10px] font-black tabular-nums">{g.services.length}</div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredData.raw.map((s, i) => {
                        const laborRateToUse = s.applied_labor_rate || laborRate;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 20px', verticalAlign: 'middle', textAlign: 'left', whiteSpace: 'nowrap', width: '1%' }}><span style={{ fontSize: 10, fontWeight: 900, color: '#71717a' }}>{formatDate(s.service_date, 'day')}</span></td>
                            <td style={{ verticalAlign: 'middle', padding: '14px 20px', textAlign: 'left', whiteSpace: 'nowrap', width: '1%' }}>
                              <button onClick={() => s.community_id && setSelectedCommunityForDrawer(s.community_id)} className="text-[12px] font-black text-zinc-900">{s.source_community_name}</button>
                            </td>
                            <td style={{ verticalAlign: 'middle', padding: '14px 20px', textAlign: 'left' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                {s.service_product_usage.slice(0, 1).map((u: any, ui: number) => (
                                  <span key={ui} style={{ fontSize: 11, fontWeight: 700, color: '#18181b', lineHeight: '1.2' }}>
                                    • {u.products?.name || u.products?.sku || 'Service Performed'}
                                  </span>
                                ))}
                                {s.service_product_usage.length > 1 && (
                                  <span style={{ fontSize: 9, fontWeight: 900, color: '#a1a1aa', marginTop: 2, textTransform: 'uppercase' }}>
                                    +{s.service_product_usage.length - 1} MORE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', padding: '14px 20px', textAlign: 'left', whiteSpace: 'nowrap', width: '1%' }}>
                              <div className="flex flex-col items-start text-left">
                                <span className="text-[11px] font-bold text-zinc-800">{s.crew_leader}</span>
                                {s.service_team_members?.length > 0 && (
                                  <span className="text-[9px] font-black text-zinc-400 uppercase">+{s.service_team_members.length} CREW</span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', verticalAlign: 'middle', padding: '14px 36px 14px 20px', whiteSpace: 'nowrap', width: '1%' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#18181b' }}>
                                {fmtFull((s.total_labor_hours_num || 0) * (s.crew_count || 1) * (s.applied_labor_rate || laborRate) + s.service_product_usage.reduce((sum: number, u: any) => sum + ((u.quantity_used || 0) * (u.applied_unit_price || u.products?.unit_price || 0)), 0))}
                              </span>
                            </td>
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
        </div>
      </div>
    )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .filter-label { display: block; font-size: 10px; font-weight: 900; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-style: italic; }
        .btn-export { background: white; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 16px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; transition: all 0.2s; cursor: pointer; }
        .btn-export:hover { border-color: #18181b; background: #fafafa; }
        .badge-zinc { background: #f4f4f5; color: #18181b; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid #e4e4e7; }
        .tgs-table { width: auto !important; border-collapse: collapse; margin: 0 auto; }
      `}} />
      
      {selectedCommunityForDrawer && (
        <CommunityDrawer communityId={selectedCommunityForDrawer} onClose={() => setSelectedCommunityForDrawer(null)} />
      )}
    </div>
  );
}

// SortIcon and MultiSelectCombobox removed from here (now at top)
