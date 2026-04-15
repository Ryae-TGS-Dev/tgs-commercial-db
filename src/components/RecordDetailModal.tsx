'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History, User, Users, Clock, Info } from 'lucide-react';
import { ServiceDisplay } from './ServiceDisplay';
import { CrewLeaderDisplay } from './CrewLeaderDisplay';

export function RecordDetailModal({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative z-[10000] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto fade-up">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Service Record Detail</div>
            <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
              {new Date(log.service_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-700 transition">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-8">
          {/* Service Performed */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-zinc-400">
              <History size={14} />
              <h3 className="text-xs font-black uppercase tracking-widest">Scope of Work</h3>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                <ServiceDisplay text={log.service_performed} />
              </div>
              {log.zone_name && (
                <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="text-[10px] font-black uppercase text-zinc-400 mr-2">Target Zone:</span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">{log.zone_name}</span>
                </div>
              )}
            </div>
          </section>

          {/* Crew Info */}
          <div className="grid grid-cols-2 gap-4">
            <section className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                <Users size={14} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Personnel</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">Lead</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{log.crew_leader}</div>
                </div>
                {log.crew_members && (
                  <div>
                    <div className="text-[9px] font-bold text-zinc-400 uppercase">Support</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">{log.crew_members}</div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                <Clock size={14} />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Efficiency</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">Total Hours</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{log.labor_hours || log.total_labor_hours_num + ' hrs'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-zinc-400 uppercase">Crew Size</div>
                  <div className="text-sm font-bold text-zinc-600 dark:text-zinc-400">{log.crew_count} Units</div>
                </div>
              </div>
            </section>
          </div>

          {/* Material Usage */}
          {log.service_product_usage?.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3 text-zinc-400">
                <Info size={14} />
                <h3 className="text-xs font-black uppercase tracking-widest">Material Consumption</h3>
              </div>
              <div className="flex flex-col gap-2">
                {log.service_product_usage.map((u: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">{u.products?.sku}</span>
                    <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{u.quantity_used} Units</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Classification */}
          <div className="pt-4 flex gap-2">
             <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${log.is_special_service ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white border-zinc-100 text-zinc-400'}`}>
               {log.service_category || 'Contract Maintenance'}
             </span>
             {log.is_one_time_service && (
               <span className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                 One-Time
               </span>
             )}
          </div>
        </div>

        <div className="mt-12">
          <button type="button" onClick={() => setIsOpen(false)} className="w-full btn btn-ghost py-4 flex justify-center text-sm font-black uppercase tracking-widest">
            Close Record
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-ghost px-2 py-1 text-xs">
        View
      </button>
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
