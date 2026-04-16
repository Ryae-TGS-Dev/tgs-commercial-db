'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Save, Shield, Package } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { supabase } from '@/lib/supabase';

export function EditProductModal({ product }: { product: any }) {
  const { refreshData, patchProduct, masterCategories, masterUnits } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    unit_price: product?.unit_price || 0,
    coverage_sqft: product?.coverage_sqft || 0,
    unit: product?.unit || 'BAG',
    category: product?.category || 'Standard',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // UX-3: Reset form when modal opens for "Add Material" case
  useEffect(() => {
    if (isOpen && !product) {
      setFormData({ sku: '', unit_price: 0, coverage_sqft: 0, unit: 'BAG', category: 'Standard' });
    }
  }, [isOpen, product]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const price = parseFloat(formData.unit_price.toString());
      const coverage = parseFloat(formData.coverage_sqft.toString());
      
      const payload = {
        sku: formData.sku,
        unit_price: isNaN(price) ? 0 : price,
        coverage_sqft: isNaN(coverage) ? 0 : coverage,
        unit: (formData.unit || 'BAG').toUpperCase(),
        category: formData.category || 'Standard',
      };

      if (product) {
        // UPDATE
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);
        if (error) throw error;
        await patchProduct(product.id, payload);
      } else {
        // INSERT
        const { error, data } = await supabase
          .from('products')
          .insert([payload])
          .select();
        if (error) throw error;
        if (data?.[0]) await patchProduct(data[0].id, data[0]);
      }
      
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save material: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative z-[10000] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-8 fade-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">
            {product ? 'Edit Material' : 'Add Material'}
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-700 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">SKU / Material Name</label>
            <input type="text" name="sku" className="input" value={formData.sku} onChange={handleChange} placeholder="e.g. 16-0-8 Fertilizer" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Category</label>
            <select 
              name="category" 
              className="input bg-white cursor-pointer" 
              value={formData.category} 
              onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
            >
              {masterCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Unit Price ($)</label>
              <input type="number" name="unit_price" className="input" value={formData.unit_price} onChange={handleChange} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Unit Type</label>
              <select 
                name="unit" 
                className="input bg-white cursor-pointer" 
                value={formData.unit} 
                onChange={(e: any) => setFormData({ ...formData, unit: e.target.value })}
              >
                {masterUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Coverage (Square Footage)</label>
            <input type="number" name="coverage_sqft" className="input" value={formData.coverage_sqft} onChange={handleChange} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost">Cancel</button>
          <button type="button" onClick={handleSave} disabled={isLoading} className="btn btn-primary min-w-[120px] flex justify-center">
            {isLoading ? 'Saving...' : <><Save size={14} /> Save</>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {product ? (
        <button onClick={() => setIsOpen(true)} className="btn btn-ghost px-2.5 py-1.5 text-xs">Edit</button>
      ) : (
        <button onClick={() => setIsOpen(true)} className="btn btn-ghost text-xs px-3 py-1.5">+ Add Material</button>
      )}
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
