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
  TrendingDown
} from 'lucide-react';
import { CrewLeaderDisplay } from '@/components/CrewLeaderDisplay';
import { ServiceDisplay } from '@/components/ServiceDisplay';
import { CommunityDrawer } from '@/components/CommunityDrawer';

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

import { useUser } from '@/hooks/useUser';
import { useData } from '@/context/DataContext';

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

    // 1. Core Date Filters
    if (dateFrom) filtered = filtered.filter(s => s.service_date >= dateFrom);
    if (dateTo) filtered = filtered.filter(s => s.service_date <= dateTo);
    
    // 2. Restrictive Target Scope Filters
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

    // 3. Materials Filter (AND/OR Logic)
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

    // 4. Monthly Aggregation & Constraint Filtering
    const monthlyGroups: Record<string, {
      communityId: string;
      commName: string;
      monthKey: string;
      totalLaborCost: number;
      totalMaterialCost: number;
      totalVariance: number;
      totalEff: number;
      effCount: number;
      monthlyPrice: number;
      services: ServiceHistory[];
    }> = {};

    filtered.forEach(s => {
      if (!s.community_id) return;
      const m = s.service_date.substring(0, 7); // YYYY-MM
      const key = `${s.community_id}_${m}`;
      
      const comm = communities.find(c => c.id === s.community_id);
      const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate;
      let matCost = 0;
      let variance = 0;

      s.service_product_usage.forEach(u => {
        const qty = u.quantity_used || 0;
        const price = u.products?.unit_price || 0;
        const coverage = (u.products as any)?.coverage_sqft || 0;
        
        if (qty > 0 && coverage > 0 && comm?.square_footage) {
           const targetQty = comm.square_footage / coverage;
           const currentEff = (targetQty / qty) * 100;
           variance += (qty - targetQty) * price;
           
           if (!monthlyGroups[key]) {
             // We initialize below, but we need variance and eff now
           }
        }
        matCost += qty * price;
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
          monthlyPrice: comm?.total_monthly_price || 0,
          services: []
        };
      }
      
      monthlyGroups[key].totalLaborCost += laborCost;
      monthlyGroups[key].totalMaterialCost += matCost;
      monthlyGroups[key].services.push(s);

      // Re-run for precision to be safe with initialization
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

    const hasNumFilters = minPrice || maxPrice || minMaterial || maxMaterial || minLabor || maxLabor;
    
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

  // Dash Totals
  const { totalRawLabor, totalRawMaterial, totalServiceVisits, totalRawRevenue, totalProfit, totalVariance } = useMemo(() => {
    let tLab = 0;
    let tMat = 0;
    let tVar = 0;
    
    filteredData.monthly.forEach(g => {
       tLab += g.totalLaborCost;
       tMat += g.totalMaterialCost;
       tVar += g.totalVariance;
    });

    let tRev = 0;
    filteredData.monthly.forEach(g => {
       tRev += g.monthlyPrice;
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

  // Options Mapping
  const companiesList = Array.from(new Set(communities.map(c => c.company).filter(Boolean))).sort();
  const communityOptions = communities.map(c => ({ label: c.name, value: c.id }));
  const companyOptions = companiesList.map(c => ({ label: c, value: c }));
  const productOptions = products.map(p => ({ label: p.sku, value: p.sku }));

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        const laborCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate;
        const matCost = s.service_product_usage.reduce((sum, u) => sum + (u.quantity_used || 0) * (u.products?.unit_price || 0), 0);
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
    <div style={{ padding: "40px 48px", maxWidth: 1400, margin: "0 auto" }}>
      <div className="fade-up" style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            Analytics & Reports
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>Reports</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 6, fontSize: 14 }}>
            Filter communities and operations to discover cost anomalies and profitability.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {permissions.can_export_csv && (
            <button 
              onClick={exportCSV} 
              disabled={loading} 
              className="btn btn-ghost" 
              style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', padding: '10px 16px', fontSize: 13, gap: 8 }}
            >
              <Download size={14} /> Export to CSV
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
          <Loader2 size={32} color="var(--accent)" className="animate-spin" />
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Loading report...</div>
        </div>
      ) : (
        <div className="fade-up fade-up-1" style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          
          {/* Left Column: Filters */}
          <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Filter size={14} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>Query Parameters</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Dates */}
                <div>
                  <label className="filter-label">Date Range</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                    <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>to</span>
                    <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="filter-label">Target Entities</label>
                  <MultiSelectCombobox 
                    options={companyOptions} 
                    selected={selectedCompanies} 
                    onChange={setSelectedCompanies} 
                    placeholder="Search companies..." 
                  />
                  <div style={{ height: 8 }} />
                  <MultiSelectCombobox 
                    options={communityOptions} 
                    selected={selectedCommunities} 
                    onChange={setSelectedCommunities} 
                    placeholder="Search communities..." 
                  />
                </div>

                {/* Product */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
                    <label className="filter-label" style={{ marginBottom: 0 }}>Materials Applied</label>
                    <select 
                      value={productLogic} 
                      onChange={e => setProductLogic(e.target.value as any)}
                      style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)', outline: 'none' }}
                    >
                      <option value="OR">Require ANY</option>
                      <option value="AND">Require ALL</option>
                    </select>
                  </div>
                  <MultiSelectCombobox 
                    options={productOptions} 
                    selected={selectedProducts} 
                    onChange={setSelectedProducts} 
                    placeholder="Search materials..." 
                  />
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                {/* Monthly Cost Constraints */}
                <div>
                  <label className="filter-label">Constraint: Monthly Contract Value</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" placeholder="Min $" className="input" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                    <input type="number" placeholder="Max $" className="input" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                  </div>
                </div>
                
                <div>
                  <label className="filter-label">Constraint: Monthly Labor Cost</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" placeholder="Min $" className="input" value={minLabor} onChange={e => setMinLabor(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                    <input type="number" placeholder="Max $" className="input" value={maxLabor} onChange={e => setMaxLabor(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                  </div>
                </div>

                <div>
                  <label className="filter-label">Constraint: Monthly Product Cost</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="number" placeholder="Min $" className="input" value={minMaterial} onChange={e => setMinMaterial(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                    <input type="number" placeholder="Max $" className="input" value={maxMaterial} onChange={e => setMaxMaterial(e.target.value)} style={{ padding: '8px', fontSize: 12 }} />
                  </div>
                </div>

                <div>
                  <label className="filter-label">Precision Filter</label>
                  <select 
                    value={precisionFilter} 
                    onChange={e => setPrecisionFilter(e.target.value as any)}
                    className="input"
                    style={{ padding: '8px', fontSize: 12 }}
                  >
                    <option value="all">Show All Precision Grades</option>
                    <option value="waste">Material Waste (&lt;90%)</option>
                    <option value="bullseye">Bullseyes (90-110%)</option>
                    <option value="low-coverage">Low Coverage (&gt;110%)</option>
                  </select>
                </div>

                <div style={{ height: 1, background: 'var(--border)' }} />

                <button 
                  type="button"
                  className="btn btn-ghost mt-2" 
                  onClick={() => {
                    setDateFrom(''); setDateTo(''); 
                    setSelectedCommunities([]); setSelectedCompanies([]); setSelectedProducts([]);
                    setMinPrice(''); setMaxPrice(''); setMinLabor(''); setMaxLabor(''); setMinMaterial(''); setMaxMaterial('');
                    setPrecisionFilter('all');
                  }}
                  style={{ fontSize: 12 }}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Dashboard & Data */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Top KPIs representing the FILTERED dataset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profitability Banner */}
              <div className="card" style={{ padding: '24px 32px', background: totalProfit >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: totalProfit >= 0 ? '#bbf7d0' : '#fecaca' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: totalProfit >= 0 ? '#166534' : '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Filtered Target Profit Margin
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 900, color: totalProfit >= 0 ? '#16a34a' : '#dc2626', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {fmt(totalProfit)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: 32 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 4, textTransform: 'uppercase' }}>
                        Accumulated MRR
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                        {fmt(totalRawRevenue)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 4, textTransform: 'uppercase' }}>
                        Total Overhead
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                        {fmt(totalRawLabor + totalRawMaterial)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', marginBottom: 4, textTransform: 'uppercase' }}>
                        Material Variance
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: totalVariance > 0 ? '#dc2626' : '#16a34a' }}>
                        {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-KPIs */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div className="card" style={{ flex: 1, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Filtered Labor Cost
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                    {fmt(totalRawLabor)}
                  </div>
                </div>
                <div className="card" style={{ flex: 1, padding: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Filtered Material Cost
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                    {fmt(totalRawMaterial)}
                  </div>
                </div>
                <div className="card" style={{ flex: 1, padding: 20, background: 'var(--accent-dim)', borderColor: 'var(--accent-border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Service Visits Logged
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>
                    {totalServiceVisits.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                <button 
                  className={`tab-btn ${activeTab === 'monthly' ? 'active text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                  style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, background: 'none' }}
                  onClick={() => setActiveTab('monthly')}
                >
                  Monthly Aggregates ({filteredData.monthly.length})
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'raw' ? 'active text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                  style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, background: 'none' }}
                  onClick={() => setActiveTab('raw')}
                >
                  Service Records ({filteredData.raw.length})
                </button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: 600 }}>
                <table className="tgs-table" style={{ width: '100%', minWidth: 800 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, boxShadow: '0 1px 0 var(--border)' }}>
                    {activeTab === 'monthly' ? (
                      <tr>
                        <th>Month</th>
                        <th>Community</th>
                        <th style={{ textAlign: 'right' }}>Contract MRR</th>
                        <th style={{ textAlign: 'right' }}>Labor Cost</th>
                        <th style={{ textAlign: 'right' }}>Material Cost</th>
                        <th style={{ textAlign: 'center', minWidth: 140 }}>Application Precision</th>
                        <th style={{ textAlign: 'center' }}>Total Visits</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Date</th>
                        <th>Community</th>
                        <th>Service</th>
                        <th>Crew</th>
                        <th>Materials Used</th>
                        <th style={{ textAlign: 'right' }}>Labor Cost</th>
                        <th style={{ textAlign: 'right' }}>Material Cost</th>
                      </tr>
                    )}
                  </thead>
                  <tbody style={{ fontSize: 13 }}>
                    {activeTab === 'monthly' ? (
                      filteredData.monthly.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No monthly data matches the current filters.</td></tr>
                      ) : (
                        filteredData.monthly.map((g, i) => {
                          const avgEff = g.avgEff;
                          const isPrecision = avgEff !== null && avgEff >= 90 && avgEff <= 110;
                          const isOver = avgEff !== null && avgEff < 90;
                          const isUnder = avgEff !== null && avgEff > 110;

                          return (
                            <tr key={i}>
                              <td style={{ fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{g.formattedMonth}</td>
                              <td style={{ textAlign: 'left' }}>
                                <button 
                                  onClick={() => setSelectedCommunityForDrawer(g.communityId)}
                                  className="font-black text-zinc-900 dark:text-white hover:text-zinc-600 transition"
                                  style={{ textAlign: 'left', width: '100%', display: 'block' }}
                                >
                                  {g.commName}
                                </button>
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{fmt(g.monthlyPrice)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: g.totalLaborCost > 0 ? 'var(--orange-600, #ea580c)' : 'var(--text-subtle)' }}>{fmt(g.totalLaborCost)}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: g.totalMaterialCost > 0 ? 'var(--purple-600, #9333ea)' : 'var(--text-subtle)' }}>{fmt(g.totalMaterialCost)}</td>
                              <td style={{ textAlign: 'right' }}>
                                {avgEff !== null ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {isPrecision ? <Check className="w-3 h-3 text-emerald-500" /> : isOver ? <TrendingDown className="w-3 h-3 text-rose-500" /> : <TrendingUp className="w-3 h-3 text-amber-500" />}
                                      <span style={{ fontWeight: 800, color: isPrecision ? '#16a34a' : isOver ? '#e11d48' : '#d97706' }}>
                                        {avgEff.toFixed(0)}%
                                      </span>
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: isPrecision ? '#16a34a' : isOver ? '#e11d48' : '#d97706' }}>
                                      {isPrecision ? 'Bullseye' : isOver ? 'Over-Applied' : 'Low Coverage'}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-subtle)' }}>N/A</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}><span className="badge badge-neutral">{g.services.length}</span></td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      filteredData.raw.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No service visits match the current filters.</td></tr>
                      ) : (
                        filteredData.raw.map((s, i) => {
                          const lCost = (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate;
                          const mCost = s.service_product_usage.reduce((sum, u) => sum + (u.quantity_used || 0) * (u.products?.unit_price || 0), 0);
                          return (
                            <tr key={i}>
                              <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>{s.service_date}</td>
                              <td style={{ textAlign: 'left' }}>
                                <button 
                                  onClick={() => { if(s.community_id) setSelectedCommunityForDrawer(s.community_id); }}
                                  className="font-semibold hover:text-zinc-700 transition disabled:opacity-50"
                                  disabled={!s.community_id}
                                  style={{ textAlign: 'left', width: '100%', display: 'block' }}
                                >
                                  {s.source_community_name}
                                </button>
                              </td>
                              <td><ServiceDisplay text={s.service_performed} limitLines={1} size="sm" /></td>
                              <td><CrewLeaderDisplay name={s.crew_leader} crewMembers={s.crew_members} size="xs" /></td>
                              <td>
                                {s.service_product_usage.length > 0 ? (
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {s.service_product_usage.map((u: any, idx: number) => (
                                      <span key={idx} style={{ fontSize: 11, background: 'var(--surface-sunken)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                        {u.products?.sku || 'Unknown'} <span style={{ color: 'var(--text-subtle)' }}>({u.quantity_used})</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-subtle)' }}>—</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: lCost > 0 ? 'var(--text)' : 'var(--text-subtle)' }}>{lCost > 0 ? fmt(lCost) : '—'}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace', color: mCost > 0 ? 'var(--text)' : 'var(--text-subtle)' }}>{mCost > 0 ? fmt(mCost) : '—'}</td>
                            </tr>
                          );
                        })
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .filter-label {
          display: block;
          font-size: 10px;
          font-weight: 800;
          color: var(--text-subtle);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
      `}} />
      
      {selectedCommunityForDrawer && (
        <CommunityDrawer 
          communityId={selectedCommunityForDrawer} 
          onClose={() => setSelectedCommunityForDrawer(null)} 
        />
      )}
    </div>
  );
}

// Custom Multi-Select Combobox Component
function MultiSelectCombobox({ 
  options, 
  selected, 
  onChange, 
  placeholder 
}: { 
  options: { label: string; value: string }[], 
  selected: string[], 
  onChange: (vals: string[]) => void, 
  placeholder: string 
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const availableOptions = options.filter(o => !selected.includes(o.value) && o.label.toLowerCase().includes(query.toLowerCase()));
  const selectedOptions = selected.map(v => options.find(o => o.value === v)).filter(Boolean) as {label: string, value: string}[];

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      onChange([...selected, val]);
      setQuery('');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="input" style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 8 }}>
        <Search size={14} color="var(--text-muted)" />
        <input 
          type="text" 
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 12 }}
        />
      </div>

      {/* Selected Pills */}
      {selectedOptions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {selectedOptions.map(opt => (
            <div 
              key={opt.value} 
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}
            >
              {opt.label}
              <button 
                onClick={() => toggleOption(opt.value)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, padding: 0, display: 'flex' }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && availableOptions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          {availableOptions.map(opt => (
            <div 
              key={opt.value} 
              onClick={() => toggleOption(opt.value)}
              style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
