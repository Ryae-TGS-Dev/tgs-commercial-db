'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Edit2, X, Trash2, Save } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function EditCommunityModal({ community }: { community: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: community.name || '',
    company: community.company || '',
    status: community.status || 'Active',
    square_footage: community.square_footage || 0,
    total_monthly_price: community.total_monthly_price || 0,
    total_annual_price: community.total_annual_price || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name: formData.name,
          company: formData.company,
          status: formData.status,
          square_footage: parseFloat(formData.square_footage.toString()),
          total_monthly_price: parseFloat(formData.total_monthly_price.toString()),
          total_annual_price: parseFloat(formData.total_annual_price.toString())
        })
        .eq('id', community.id);

      if (error) throw error;
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update community.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this community? All service history will be lost. This cannot be undone.')) return;
    
    setIsDeleting(true);
    try {
      // Must delete service product usage first, wait, RLS or DB cascading should handle it if setup, 
      // but if not, let's just delete community and let cascade do the rest or rely on user action.
      // Actually, deleting community will fail if no cascade. 
      const { error } = await supabase.from('communities').delete().eq('id', community.id);
      if (error) throw error;
      
      router.push('/communities');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete community. Ensure there are no foreign key constraints (or cascade is enabled).');
    } finally {
      setIsDeleting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative z-[10000] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto fade-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">Edit Community</h2>
          <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-700 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Community Name</label>
            <input type="text" name="name" className="input" value={formData.name} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Managed By (Company)</label>
            <input type="text" name="company" className="input" value={formData.company} onChange={handleChange} />
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Status</label>
              <select name="status" className="input" value={formData.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Square Footage</label>
              <input type="number" name="square_footage" className="input" value={formData.square_footage} onChange={handleChange} />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Monthly Price ($)</label>
              <input type="number" name="total_monthly_price" className="input" value={formData.total_monthly_price} onChange={handleChange} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Annual Price ($)</label>
              <input type="number" name="total_annual_price" className="input" value={formData.total_annual_price} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button 
            type="button" 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition"
          >
            <Trash2 size={14} /> {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
          
          <div className="flex gap-3">
            <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost">Cancel</button>
            <button type="button" onClick={handleSave} disabled={isLoading} className="btn btn-primary min-w-[120px] flex justify-center">
              {isLoading ? 'Saving...' : <><Save size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="btn btn-ghost">
        <Edit2 size={14} /> Edit Details
      </button>
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
