'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Edit2, History, RotateCcw, Eye, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ServiceDisplay } from './ServiceDisplay';
import { CrewLeaderDisplay } from './CrewLeaderDisplay';
import { EditLogModal } from './EditLogModal';
import { RecordDetailModal } from './RecordDetailModal';

export function CommunityDrawer({ 
  communityId, 
  onClose, 
  onUpdated 
}: { 
  communityId: string | null; 
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [community, setCommunity] = useState<any>(null);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!communityId) return;
    
    async function fetchDetails() {
      setLoading(true);
      
      const { data: cData } = await supabase
        .from('communities')
        .select('*')
        .eq('id', communityId)
        .single();
        
      if (cData) {
        setCommunity(cData);
        setFormData({
          name: cData.name,
          company: cData.company,
          status: cData.status,
          total_monthly_price: cData.total_monthly_price
        });
      }

      const { data: vData } = await supabase
        .from('service_history')
        .select(`
          id, service_date, service_performed, crew_leader, crew_members, total_labor_hours_num, crew_count,
          is_special_service, is_one_time_service, service_category,
          service_product_usage(quantity_used, products(sku, unit_price))
        `)
        .eq('community_id', communityId)
        .order('service_date', { ascending: false })
        .limit(5);

      if (vData) setRecentVisits(vData);
      
      setLoading(false);
    }

    fetchDetails();
    setIsEditing(false);
  }, [communityId]);

  if (!mounted || !communityId) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name: formData.name,
          company: formData.company,
          total_monthly_price: parseFloat(formData.total_monthly_price)
        })
        .eq('id', communityId);

      if (error) throw error;
      setCommunity({ ...community, ...formData });
      setIsEditing(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
      alert('Failed to update community details.');
    } finally {
      setSaving(false);
    }
  };

  const drawerContent = (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative z-[10000] w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl h-full flex flex-col border-l border-zinc-200 dark:border-zinc-800 transform transition-transform animate-slide-in-right">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white truncate pr-4">
            {loading ? 'Loading...' : community?.name}
          </h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link 
              href={`/communities/${communityId}`} 
              className="btn btn-ghost px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 transition-all flex items-center gap-2"
            >
              Go to Community <ArrowRight size={12} />
            </Link>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-700 transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <RotateCcw className="animate-spin mb-4" size={24} />
              <p className="text-sm font-medium">Fetching records...</p>
            </div>
          ) : (
            <>
              {/* Details & Edit Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Community Profile</h3>
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1">
                      <Edit2 size={12} /> Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Name</label>
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="input w-full text-sm py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Company</label>
                      <input 
                        type="text" 
                        value={formData.company} 
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className="input w-full text-sm py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Monthly Contract Price ($)</label>
                      <input 
                        type="number" 
                        value={formData.total_monthly_price} 
                        onChange={e => setFormData({...formData, total_monthly_price: e.target.value})}
                        className="input w-full text-sm py-1.5"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1 py-1.5 text-xs flex justify-center items-center gap-1">
                        {saving ? 'Saving...' : <><Save size={14} /> Save</>}
                      </button>
                      <button onClick={() => setIsEditing(false)} className="btn btn-ghost flex-1 py-1.5 text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-xs font-bold text-zinc-400">Company / Manager</div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{community.company || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-400">Monthly Value</div>
                      <div className="text-sm font-mono font-semibold text-zinc-900 dark:text-zinc-100">${parseFloat(community.total_monthly_price || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                    </div>
                  </div>
                )}
              </section>

              {/* Recent Visits Section */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <History size={16} className="text-zinc-400" />
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Recent Service Records</h3>
                </div>
                
                {recentVisits.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No recent service records found.</p>
                ) : (
                  <div className="flex flex-col relative before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
                    {recentVisits.map((v, i) => (
                      <div key={v.id} className="relative pl-8 pb-6 last:pb-0">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center z-10 text-[10px] font-bold text-zinc-500">
                          {i + 1}
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                          <div className="flex justify-between items-start mb-2">
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {v.is_one_time_service && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--amber)", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 4 }}>One-Time</span>
                              )}
                              {v.is_special_service && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-dim)", padding: "2px 8px", borderRadius: 4 }}>{v.service_category || 'Special'}</span>
                              )}
                              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{new Date(v.service_date).toLocaleDateString()}</div>
                            </div>
                            <div className="flex gap-1">
                              <RecordDetailModal log={v} />
                              <EditLogModal log={v} />
                            </div>
                          </div>
                          <div className="mb-3 text-sm">
                            <ServiceDisplay text={v.service_performed} size="sm" limitLines={2} />
                          </div>
                          
                          <div className="flex flex-col gap-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
                            <CrewLeaderDisplay name={v.crew_leader} crewMembers={v.crew_members} size="xs" />
                            
                            {v.service_product_usage?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {v.service_product_usage.map((u: any, idx: number) => (
                                  <span key={idx} className="text-[10px] bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                                    {u.products?.sku} ({u.quantity_used})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );

  return createPortal(drawerContent, document.body);
}
