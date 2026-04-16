'use client';

import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Tag, Plus, X, Loader2, Info } from 'lucide-react';
import { Tooltip } from './Tooltip';

export function MasterLabelEditor() {
  const { patchSettings, masterCategories, masterUnits } = useData();
  const [newCat, setNewCat] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const handleUpdate = async (type: 'categories' | 'units', newList: string[]) => {
    const key = type === 'categories' ? 'master_categories' : 'master_units';
    await patchSettings(key, JSON.stringify(newList));
  };

  const addItem = (type: 'categories' | 'units', val: string) => {
    if (!val.trim()) return;
    // Normalize: title-case for categories, uppercase for units
    const normalized = type === 'categories'
      ? val.trim().replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
      : val.trim().toUpperCase();
    const current = type === 'categories' ? masterCategories : masterUnits;
    if (current.includes(normalized)) return;
    
    const next = [...current, normalized].sort();
    handleUpdate(type, next);
    if (type === 'categories') setNewCat('');
    else setNewUnit('');
  };

  const removeItem = (type: 'categories' | 'units', val: string) => {
    const current = type === 'categories' ? masterCategories : masterUnits;
    const next = current.filter(item => item !== val);
    handleUpdate(type, next);
  };

  return (
    <div className="space-y-12">
      {/* Categories */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded-md">
            <Tag size={12} className="text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Approved Material Categories</span>
          </div>
          <Tooltip content="These categories appear in your material catalog dropdowns. Lock these down to prevent spelling errors.">
            <Info size={12} className="text-amber-500 cursor-help" />
          </Tooltip>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6 mt-4">
          {masterCategories.map(cat => (
            <span key={cat} className="group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white dark:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 transition-all shadow-sm">
              {cat}
              <button 
                onClick={() => removeItem('categories', cat)}
                className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {masterCategories.length === 0 && (
            <div className="text-xs text-zinc-400 italic">No approved categories set.</div>
          )}
        </div>

        <div className="flex gap-2 max-w-sm">
          <input 
            type="text" 
            className="input text-xs py-2 shadow-sm" 
            placeholder="e.g. Fertilizer, Herbicide..." 
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem('categories', newCat)}
          />
          <button 
            className="btn btn-primary py-2 px-4 text-xs flex items-center gap-2"
            onClick={() => addItem('categories', newCat)}
          >
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* Units */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-2 px-2 py-1 bg-zinc-100 rounded-md">
            <div className="w-3 h-3 border-2 border-zinc-400 rounded-sm" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Approved Unit Types</span>
          </div>
          <Tooltip content="Measurement units like BAG, GAL, or PAL. Keeping this list short prevents fragmented inventory data.">
            <Info size={12} className="text-amber-500 cursor-help" />
          </Tooltip>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6 mt-4">
          {masterUnits.map(unit => (
            <span key={unit} className="group inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 rounded-xl text-[10px] font-black tracking-widest border border-blue-100/50 dark:border-blue-900/20 hover:border-blue-300 transition-all shadow-sm">
              {unit}
              <button 
                onClick={() => removeItem('units', unit)}
                className="text-blue-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-sm">
          <input 
            type="text" 
            className="input text-xs py-2 shadow-sm uppercase" 
            placeholder="e.g. BAG, GAL, PAL..." 
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem('units', newUnit)}
          />
          <button 
            className="btn btn-primary py-2 px-4 text-xs flex items-center gap-2"
            onClick={() => addItem('units', newUnit)}
          >
            <Plus size={14} /> Add Unit
          </button>
        </div>
      </div>
    </div>
  );
}
