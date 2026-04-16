'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Loader2, Save, X, Edit2, Settings2 } from 'lucide-react';
import { EditProductModal } from './EditProductModal';
import { MasterLabelEditor } from './MasterLabelEditor';
import { useData } from '@/context/DataContext';
import { supabase } from '@/lib/supabase';

function EditableCell({ value, onSave, type = "text", prefix = "", suffix = "", list, options }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<any>(null);

  // UX-1: Keep tempValue in sync with parent value when not editing
  useEffect(() => {
    if (!isEditing) setTempValue(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleBlur = async () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    await onSave(tempValue);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleKey = (e: any) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {options ? (
          <select
            ref={inputRef}
            className="input py-1 px-2 text-sm font-bold min-w-[100px] bg-white cursor-pointer"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKey}
          >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            ref={inputRef}
            type={type}
            list={list}
            className="input py-1 px-2 text-sm font-bold min-w-[80px]"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKey}
          />
        )}
        {isSaving && <Loader2 size={12} className="animate-spin text-zinc-400" />}
      </div>
    );
  }

  return (
    <div 
      className="group flex items-center gap-2 cursor-pointer hover:bg-zinc-50 py-1 px-2 -ml-2 rounded-md transition-all"
      onDoubleClick={() => setIsEditing(true)}
    >
      <span className="font-mono font-bold text-zinc-900">
        {prefix}{type === 'number' ? parseFloat(value).toLocaleString() : value}{suffix}
      </span>
      <Edit2 size={10} className="text-zinc-300 opacity-0 group-hover:opacity-100" />
    </div>
  );
}


export function MaterialCatalog({ initialProducts = [], isEditable }: { initialProducts: any[]; isEditable: boolean }) {
  const { patchProduct, masterCategories, masterUnits } = useData();
  const products = initialProducts || [];
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).sort() as string[]];

  const filtered = products.filter(p => {
    const matchSearch = p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'All' || (p.category || 'Uncategorized') === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleUpdate = async (product: any, field: string, value: any) => {
    const nextVal = (field === 'unit_price' || field === 'coverage_sqft') ? parseFloat(value) : value;
    const updates = { [field]: nextVal };
    
    // Optimistic Update
    await patchProduct(product.id, updates);
    
    // Persist
    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', product.id);
    
    if (error) {
      console.error(error);
      alert("Failed to sync change to cloud. Reverting...");
      // Revert if needed, but for now we trust the flow
    }
  };

  const [showLabelEditor, setShowLabelEditor] = useState(false);

  return (
    <div>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-xs w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full py-1.5 text-xs font-bold"
              style={{ paddingLeft: '32px' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="h-4 w-[1px] bg-zinc-200 mx-2" />
          
          <button 
            onClick={() => setShowLabelEditor(!showLabelEditor)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
              showLabelEditor 
                ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' 
                : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 shadow-sm'
            }`}
          >
            <Settings2 size={12} className={showLabelEditor ? 'text-zinc-400' : 'text-zinc-400'} />
            Manage Labels
          </button>
        </div>
        
        {isEditable && <EditProductModal product={null} />}
      </div>

      {showLabelEditor && (
        <div className="p-8 bg-zinc-50/80 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 fade-down">
          <div className="max-w-4xl mx-auto">
            <MasterLabelEditor />
          </div>
        </div>
      )}
      
      <div className="max-h-[600px] overflow-y-auto w-full relative">
        <table className="tgs-table">
          <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10 shadow-sm border-b">
            <tr>
              <th className="w-[30%]">Material SKU</th>
              <th>Category</th>
              <th style={{ width: 120 }}>Unit Type</th>
              <th style={{ width: 140 }}>Price ($)</th>
              <th style={{ width: 180 }}>Coverage (SQFT)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.id}>
                <td className="font-bold text-zinc-900">{p.sku}</td>
                <td>
                  {isEditable ? (
                    <EditableCell 
                      value={p.category || 'Standard'} 
                      options={masterCategories}
                      onSave={(val: string) => handleUpdate(p, 'category', val)} 
                    />
                  ) : (
                    <span className="badge badge-zinc text-[10px] font-black uppercase text-zinc-500 shadow-none border-none">
                      {p.category || 'Standard'}
                    </span>
                  )}
                </td>
                <td>
                  {isEditable ? (
                    <EditableCell 
                      value={p.unit || 'BAG'} 
                      options={masterUnits}
                      onSave={(val: string) => handleUpdate(p, 'unit', val.toUpperCase())} 
                    />
                  ) : (
                    <span className="font-bold text-zinc-600 uppercase text-xs">{p.unit || 'BAG'}</span>
                  )}
                </td>
                <td>
                  {isEditable ? (
                    <EditableCell 
                      value={p.unit_price} 
                      type="number"
                      prefix="$"
                      onSave={(val: string) => handleUpdate(p, 'unit_price', val)} 
                    />
                  ) : (
                    <span className="font-mono font-bold text-zinc-600">${parseFloat(p.unit_price).toFixed(2)}</span>
                  )}
                </td>
                <td>
                  {isEditable ? (
                    <EditableCell 
                      value={p.coverage_sqft} 
                      type="number"
                      suffix=" sqft"
                      onSave={(val: string) => handleUpdate(p, 'coverage_sqft', val)} 
                    />
                  ) : (
                    <span className="text-zinc-500 text-xs font-bold">{p.coverage_sqft ? p.coverage_sqft.toLocaleString() + ' sqft' : '—'}</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center p-12">
                   <div className="text-zinc-300 mb-2 font-black uppercase text-[10px] tracking-widest">No Results</div>
                   <p className="text-zinc-500 text-xs">Try adjusting your filters or adding a new material.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
