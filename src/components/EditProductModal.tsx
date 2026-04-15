'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { X, Save, Shield, Package } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function EditProductModal({ product }: { product: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    unit_price: product?.unit_price || 0,
    coverage_sqft: product?.coverage_sqft || 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (product) {
        // UPDATE
        const { error } = await supabase
          .from('products')
          .update({
            sku: formData.sku,
            unit_price: parseFloat(formData.unit_price.toString()),
            coverage_sqft: parseFloat(formData.coverage_sqft.toString()),
          })
          .eq('id', product.id);
        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase
          .from('products')
          .insert([{
            sku: formData.sku,
            unit_price: parseFloat(formData.unit_price.toString()),
            coverage_sqft: parseFloat(formData.coverage_sqft.toString()),
          }]);
        if (error) throw error;
      }
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save material.');
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
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Unit Price ($)</label>
            <input type="number" name="unit_price" className="input" value={formData.unit_price} onChange={handleChange} />
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
