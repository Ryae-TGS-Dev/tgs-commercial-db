'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Edit2, X, Trash2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function EditLogModal({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    service_date: log.service_date ? new Date(log.service_date).toISOString().split('T')[0] : '',
    zone_name: log.zone_name || '',
    service_performed: log.service_performed || '',
    crew_leader: log.crew_leader || '',
    crew_members: log.crew_members || '',
    labor_hours: log.labor_hours || '',
    crew_count: log.crew_count || 0,
    is_special_service: log.is_special_service || false,
    is_one_time_service: log.is_one_time_service || false,
    service_category: log.service_category || 'Contract Maintenance',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('service_history')
        .update({
          service_date: formData.service_date,
          zone_name: formData.zone_name,
          service_performed: formData.service_performed,
          crew_leader: formData.crew_leader,
          crew_members: formData.crew_members,
          labor_hours: formData.labor_hours,
          crew_count: parseInt(formData.crew_count.toString() || '0'),
          is_special_service: formData.is_special_service,
          is_one_time_service: formData.is_one_time_service,
          service_category: formData.is_special_service 
            ? formData.service_category 
            : formData.is_one_time_service 
              ? 'One Time Service' 
              : 'Contract Maintenance',
        })
        .eq('id', log.id);

      if (error) throw error;
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update service log.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service log? This cannot be undone.')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('service_history').delete().eq('id', log.id);
      if (error) throw error;
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete service log.');
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
          <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">Edit Service Log</h2>
          <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-zinc-700 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Service Date</label>
              <input type="date" name="service_date" className="input" value={formData.service_date} onChange={handleChange} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Zone Name</label>
              <input type="text" name="zone_name" className="input" value={formData.zone_name} onChange={handleChange} placeholder="Optional" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Service Performed</label>
            <textarea name="service_performed" className="input" rows={4} value={formData.service_performed} onChange={handleChange} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Crew Leader</label>
              <input type="text" name="crew_leader" className="input" value={formData.crew_leader} onChange={handleChange} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Crew Count</label>
              <input type="number" name="crew_count" className="input" value={formData.crew_count} onChange={handleChange} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Crew Members</label>
            <input type="text" name="crew_members" className="input" value={formData.crew_members} onChange={handleChange} placeholder="e.g. John Doe, Jane Smith" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-700 dark:text-zinc-300">Labor Hours</label>
            <input type="text" name="labor_hours" className="input" value={formData.labor_hours} onChange={handleChange} placeholder="e.g. 2 hrs 30 mins" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">Service Type Options</label>
            
            <div className="card" style={{ padding: 14, borderColor: formData.is_one_time_service ? 'rgba(245,158,11,0.4)' : undefined, background: formData.is_one_time_service ? 'rgba(245,158,11,0.05)' : undefined }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div
                  style={{ width: 40, height: 22, borderRadius: 11, background: formData.is_one_time_service ? '#f59e0b' : 'var(--surface-2)', border: `1px solid ${formData.is_one_time_service ? '#f59e0b' : 'var(--border)'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}
                  onClick={() => setFormData({ ...formData, is_one_time_service: !formData.is_one_time_service, is_special_service: false })}
                >
                  <div style={{ position: 'absolute', top: 2, left: formData.is_one_time_service ? 19 : 2, width: 16, height: 16, borderRadius: 8, background: 'white', transition: 'left 0.2s' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>One Time Service</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Single engagement — not part of recurring contract</div>
                </div>
              </label>
            </div>

            <div className="card" style={{ padding: 14, borderColor: formData.is_special_service ? 'var(--accent-border)' : undefined, background: formData.is_special_service ? 'var(--accent-dim)' : undefined }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div
                  style={{ width: 40, height: 22, borderRadius: 11, background: formData.is_special_service ? 'var(--accent)' : 'var(--surface-2)', border: `1px solid ${formData.is_special_service ? 'var(--accent)' : 'var(--border)'}`, position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}
                  onClick={() => setFormData({ ...formData, is_special_service: !formData.is_special_service, is_one_time_service: false })}
                >
                  <div style={{ position: 'absolute', top: 2, left: formData.is_special_service ? 19 : 2, width: 16, height: 16, borderRadius: 8, background: 'white', transition: 'left 0.2s' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Special Service / Extra</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Non-contractual extra work</div>
                </div>
              </label>
              {formData.is_special_service && (
                <div style={{ marginTop: 12 }}>
                  <input className="input" placeholder="Service category (e.g. Storm cleanup)" name="service_category" value={formData.service_category} onChange={handleChange} />
                </div>
              )}
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
      <button onClick={() => setIsOpen(true)} className="btn btn-ghost px-2 py-1 text-xs">
        <Edit2 size={13} /> Edit
      </button>
      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
