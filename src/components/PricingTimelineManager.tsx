'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  History, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Calendar,
  Box,
  User,
  LayoutGrid
} from 'lucide-react';

export function PricingTimelineManager() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: timelineData }, { data: productData }] = await Promise.all([
      supabase.from('pricing_timeline').select('*').order('start_date', { ascending: false }),
      supabase.from('products').select('sku').order('sku')
    ]);
    setTimeline(timelineData || []);
    setProducts(productData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addRange = async (type: 'labor' | 'material') => {
    const newRange = {
      start_date: new Date().toISOString().split('T')[0],
      type: type,
      rate: type === 'labor' ? 32.50 : 0.00,
      ref_id: type === 'material' ? products[0]?.sku : null
    };
    const { data, error } = await supabase
      .from('pricing_timeline')
      .insert(newRange)
      .select()
      .single();
    
    if (error) {
      alert(`Error adding period: ${error.message}. Please ensure you have run the database migration.`);
      return;
    }
    if (data) setTimeline([data, ...timeline]);
  };

  const deleteRange = async (id: string) => {
    const { error } = await supabase.from('pricing_timeline').delete().eq('id', id);
    if (error) {
      alert(`Error deleting period: ${error.message}`);
      return;
    }
    setTimeline(timeline.filter(t => t.id !== id));
  };

  const updateRange = async (id: string, updates: any) => {
    const { error } = await supabase.from('pricing_timeline').update(updates).eq('id', id);
    if (error) {
      alert(`Error updating period: ${error.message}`);
      return;
    }
    setTimeline(timeline.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const syncHistory = async () => {
    if (!confirm('This will update all historical service records with their corresponding rates from the timeline. Current snapshots will be preserved. Proceed?')) return;
    
    setIsSyncing(true);
    setSyncStatus({ message: 'Initializing baseline sync...', pct: 10 });

    try {
      // 1. Get all timeline entries
      const { data: ranges } = await supabase
        .from('pricing_timeline')
        .select('*')
        .order('start_date', { ascending: true });

      if (!ranges || ranges.length === 0) {
        throw new Error('No pricing ranges defined. Please add at least one range.');
      }

      let totalLaborUpdated = 0;
      let totalMaterialUpdated = 0;

      // 2. Loop through ranges
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const progress = 10 + Math.floor(((i + 1) / ranges.length) * 80);
        
        setSyncStatus({ 
          message: `Stamping ${range.type === 'labor' ? 'Labor' : range.ref_id} records from ${range.start_date}...`, 
          pct: progress 
        });

        if (range.type === 'labor') {
          let query = supabase
            .from('service_history')
            .update({ applied_labor_rate: range.rate })
            .is('applied_labor_rate', null)
            .gte('service_date', range.start_date);

          if (range.end_date) query = query.lte('service_date', range.end_date);
          const { count } = await query.select('id', { count: 'exact' });
          totalLaborUpdated += count || 0;
        } else {
          // Material Sync - requires joining usage with history date
          // We'll do this by fetching the service IDs in range first
          let sQuery = supabase
            .from('service_history')
            .select('id')
            .gte('service_date', range.start_date);
          
          if (range.end_date) sQuery = sQuery.lte('service_date', range.end_date);
          const { data: sIds } = await sQuery;

          if (sIds && sIds.length > 0) {
            const ids = sIds.map(s => s.id);
            // Get product_id from SKU
            const { data: prod } = await supabase.from('products').select('id').eq('sku', range.ref_id).single();
            if (prod) {
              const { count } = await supabase
                .from('service_product_usage')
                .update({ applied_unit_price: range.rate })
                .is('applied_unit_price', null)
                .eq('product_id', prod.id)
                .in('service_id', ids)
                .select('id', { count: 'exact' });
              totalMaterialUpdated += count || 0;
            }
          }
        }
      }

      setSyncStatus({ 
        message: `Successfully stamped ${totalLaborUpdated} labor & ${totalMaterialUpdated} material records.`, 
        pct: 100, 
        done: true 
      });
    } catch (err: any) {
      setSyncStatus({ message: err.message, pct: 0, error: true });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={18} className="text-zinc-400" />
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Pricing Timeline</h3>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => addRange('labor')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-100 bg-amber-50/50 text-[10px] font-black uppercase text-amber-700 hover:bg-amber-100 hover:border-amber-200 transition-all shadow-sm"
          >
            <User size={12} /> Add Labor Period
          </button>
          <button 
            onClick={() => addRange('material')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50/50 text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100 hover:border-blue-200 transition-all shadow-sm"
          >
            <Box size={12} /> Add Material Period
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-zinc-300" /></div>
      ) : timeline.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
          <Calendar size={32} className="mx-auto text-zinc-200 mb-3" />
          <p className="text-sm font-medium text-zinc-400">No defined pricing periods yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timeline.map((range) => (
            <div key={range.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group">
              <div className="flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm border border-zinc-100 text-zinc-400">
                {range.type === 'labor' ? <User size={16} /> : <Box size={16} />}
              </div>
              
              <div className="flex-1 grid grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Type & Target</div>
                  {range.type === 'labor' ? (
                    <div className="text-xs font-black text-zinc-900 flex items-center gap-2 h-5">
                      <LayoutGrid size={12} className="text-zinc-400" /> Global Labor
                    </div>
                  ) : (
                    <select 
                      value={range.ref_id} 
                      onChange={(e) => updateRange(range.id, { ref_id: e.target.value })}
                      className="w-full bg-transparent font-black text-xs focus:outline-none text-zinc-900 border-none p-0 h-5"
                    >
                      {products.map(p => <option key={p.sku} value={p.sku}>{p.sku}</option>)}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Start Date</div>
                  <input 
                    type="date" 
                    value={range.start_date} 
                    onClick={(e) => (e.currentTarget as any).showPicker?.()}
                    onChange={(e) => updateRange(range.id, { start_date: e.target.value })}
                    className="w-full bg-transparent font-bold text-sm focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">End Date</div>
                  <input 
                    type="date" 
                    value={range.end_date || ''} 
                    onClick={(e) => (e.currentTarget as any).showPicker?.()}
                    onChange={(e) => updateRange(range.id, { end_date: e.target.value || null })}
                    className="w-full bg-transparent font-bold text-sm focus:outline-none text-zinc-900 cursor-pointer"
                    placeholder="Open Ended"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Rate ($)</div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-bold text-xs">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={range.rate} 
                      onChange={(e) => updateRange(range.id, { rate: parseFloat(e.target.value) })}
                      className="w-full bg-transparent font-black text-sm focus:outline-none text-zinc-900"
                    />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => deleteRange(range.id)}
                className="p-2 text-zinc-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-black text-xs"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sync Tool */}
      <div className="pt-6 border-t border-zinc-100">
        <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-sm font-black uppercase tracking-widest text-amber-500">Update Past Pricing</h4>
              <p className="text-xs text-zinc-400 font-medium max-w-[300px]">Update your old service records to use these rates so your past profit reports are accurate.</p>
            </div>
            
            <button 
              onClick={syncHistory}
              disabled={isSyncing || timeline.length === 0}
              className="px-6 py-3 bg-white text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-100 disabled:opacity-50 transition-all"
            >
              {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Update Old Records
            </button>
          </div>

          {syncStatus && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${syncStatus.error ? 'text-rose-500' : 'text-zinc-400'}`}>
                  {syncStatus.message}
                </span>
                {syncStatus.done && <CheckCircle2 size={14} className="text-emerald-500" />}
              </div>
              <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${syncStatus.error ? 'bg-rose-500' : 'bg-amber-500'}`} 
                  style={{ width: `${syncStatus.pct}%` }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
