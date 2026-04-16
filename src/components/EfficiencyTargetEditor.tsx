'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, CheckCircle2, AlertCircle, Save, Info } from 'lucide-react';
import { useData } from '@/context/DataContext';

export function EfficiencyTargetEditor() {
  const [target, setTarget] = useState(60.0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { efficiencyTarget, patchSettings } = useData();

  useEffect(() => {
    setTarget(efficiencyTarget);
  }, [efficiencyTarget]);

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await patchSettings('efficiency_target', target.toString());
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target size={18} className="text-zinc-400" />
        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500">Efficiency Bullseye</h3>
      </div>

      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 max-w-[340px]">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-zinc-900">Product Usage Goal (%)</h4>
            <div className="group relative">
               <Info size={12} className="text-zinc-300 cursor-help" />
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-zinc-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50 leading-relaxed">
                 This is the target amount of product to use on each area.
               </div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 font-medium">We use this to check if you are using the right amount of product. Hitting this number counts as a 'Bullseye' in your reports.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="number" 
              step="0.1"
              value={target}
              onChange={(e) => setTarget(parseFloat(e.target.value))}
              className="w-28 bg-white border border-zinc-200 px-4 py-3 rounded-xl font-black text-zinc-900 focus:outline-none focus:border-zinc-900 transition-all text-center"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-xs">%</span>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase italic ml-1">
          <CheckCircle2 size={12} /> Target updated successfully
        </div>
      )}
    </div>
  );
}

function Loader2({ size, className }: { size: number, className: string }) {
   return <div className={className} style={{ width: size, height: size, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
}
