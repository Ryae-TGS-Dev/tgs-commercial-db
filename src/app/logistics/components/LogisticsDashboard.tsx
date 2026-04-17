'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, 
  Map as MapIcon, 
  List, 
  Search, 
  CloudRain, 
  AlertCircle, 
  CheckCircle2, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCcw,
  RotateCcw,
  FileText,
  X
} from 'lucide-react';
import { generateBriefingPDF } from '@/lib/pdf-generator';
import dynamic from 'next/dynamic';

const PlanningMap = dynamic(() => import('./PlanningMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 animate-pulse flex items-center justify-center text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Initializing Map...</div>
});

export function LogisticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // Force the document body to hide overflow while on this page
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  async function fetchInitialData() {
    setLoading(true);
    const [cResp, sResp] = await Promise.all([
      supabase.from('communities').select('id, name, company, square_footage, latitude, longitude, status').eq('status', 'Active'),
      supabase.from('logistics_settings').select('key, value')
    ]);

    if (cResp.data) setCommunities(cResp.data);
    if (sResp.data) {
      setSettings(Object.fromEntries(sResp.data.map(s => [s.key, s.value])));
    }
    setLoading(false);
  }

  async function fetchTasks() {
    // 1. Fetch Today's Tasks
    const { data: todayData } = await supabase
      .from('scheduled_tasks')
      .select('*, community:communities(name, company, latitude, longitude, square_footage)')
      .eq('scheduled_date', selectedDate);
    
    if (todayData) setTasks(todayData);
    
    // 2. Fetch Recently Serviced (Last 7 days) for Map Visualization
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: recentData } = await supabase
      .from('service_history')
      .select('community_id, service_date')
      .gte('service_date', sevenDaysAgo.toISOString().split('T')[0]);
      
    if (recentData) {
      const recentMap = new Set(recentData.map(r => r.community_id));
      setCommunities(prev => prev.map(c => ({
        ...c,
        isRecentlyServiced: recentMap.has(c.id)
      })));
    }
  }

  const handleDragStart = (e: React.DragEvent, communityId: string) => {
    e.dataTransfer.setData('communityId', communityId);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const communityId = e.dataTransfer.getData('communityId');
    if (!communityId) return;

    // Create a new task for this day
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .insert({
        community_id: communityId,
        scheduled_date: selectedDate,
        status: 'Pending',
        service_method: 'Both'
      })
      .select('*, community:communities(name, company, latitude, longitude, square_footage)')
      .single();

    if (!error && data) {
      setTasks(prev => [...prev, data]);
    } else {
      console.error(error);
    }
  };

  const updateTask = async (updatedTask: any) => {
    setIsSavingTask(true);
    try {
      if (updatedTask.id) {
        // Update existing
        const { error } = await supabase
          .from('scheduled_tasks')
          .update({
            procedure_notes: updatedTask.procedure_notes,
            priority_areas: updatedTask.priority_areas,
            priority_tasks: updatedTask.priority_tasks,
            spanish_notes: updatedTask.spanish_notes,
            service_method: updatedTask.service_method,
            status: updatedTask.status,
            is_fixed: updatedTask.is_fixed
          })
          .eq('id', updatedTask.id);

        if (!error) {
          setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        }
      } else {
        // Create new (from click planning)
        const { data, error } = await supabase
          .from('scheduled_tasks')
          .insert({
            community_id: updatedTask.community_id,
            scheduled_date: selectedDate,
            procedure_notes: updatedTask.procedure_notes,
            priority_areas: updatedTask.priority_areas,
            priority_tasks: updatedTask.priority_tasks,
            spanish_notes: updatedTask.spanish_notes,
            service_method: updatedTask.service_method,
            status: 'Pending',
            is_fixed: updatedTask.is_fixed
          })
          .select('*, community:communities(name, company, latitude, longitude, square_footage)')
          .single();

        if (!error && data) {
          setTasks(prev => [...prev, data]);
        }
      }
      setSelectedTask(null);
    } finally {
      setIsSavingTask(false);
    }
  };

  const bulkExport = () => {
    if (!tasks.length) return;
    if (!confirm(`Generate ${tasks.length} separate briefing PDFs?`)) return;
    
    tasks.forEach(task => {
      generateBriefingPDF({
        communityName: task.community?.name,
        company: task.community?.company,
        date: selectedDate,
        acres: (task.community?.square_footage / 43560).toFixed(1),
        procedureNotes: task.procedure_notes,
        spanishNotes: task.spanish_notes,
        priorityAreas: task.priority_areas,
        priorityTasks: task.priority_tasks,
        serviceMethod: task.service_method
      });
    });
  };

  const translateProcedure = async () => {
    if (!selectedTask?.procedure_notes) return;
    setIsTranslating(true);
    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedTask.procedure_notes })
      });
      const data = await resp.json();
      if (data.translation) {
        setSelectedTask({ ...selectedTask, spanish_notes: data.translation });
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteTask = async (taskId: string) => {
    console.log('--- Attempting to delete task:', taskId);
    const { error } = await supabase.from('scheduled_tasks').delete().eq('id', taskId);
    if (!error) {
      console.log('--- Successfully deleted task:', taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(null);
      setConfirmDeleteId(null);
    } else {
      console.error('--- Delete Error:', error);
      alert('Failed to remove visit: ' + (error.message || 'Check database permissions'));
    }
  };

  const filteredCommunities = useMemo(() => {
    return communities.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [communities, searchTerm]);

  // Handle date navigation
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      {/* Top Controls */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 bg-white z-[50] shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-zinc-500" />
            <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-1">
              <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-zinc-200 rounded-lg transition"><ChevronLeft size={16} /></button>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold p-2 focus:ring-0"
              />
              <button onClick={() => shiftDate(1)} className="p-2 hover:bg-zinc-200 rounded-lg transition"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-200" />

          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
             <button 
              onClick={() => setViewMode('split')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'split' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
             >
               Split View
             </button>
             <button 
              onClick={() => setViewMode('map')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'map' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
             >
               Map Only
             </button>
             <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
             >
               Timeline
             </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Weather Preview (Placeholder) */}
           <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">
              <CloudRain size={16} />
              <span className="text-xs font-bold uppercase tracking-tight">Weather Risk: 45%</span>
           </div>
           
           <button 
              onClick={bulkExport}
              disabled={!tasks.length}
              className="btn btn-ghost h-10 px-4 rounded-xl flex items-center gap-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
            >
               <FileText size={16} /> Export All
            </button>
            
            <button 
              onClick={() => {
                alert('Choose a community from the list on the left and drag it into the timeline or map to create a visit.');
              }}
              className="btn btn-primary h-10 px-6 rounded-xl flex items-center gap-2"
            >
               <Plus size={16} /> Add Visit
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Community Picker */}
        <div className="w-80 border-r border-zinc-200 bg-zinc-50/50 flex flex-col z-[40]">
          <div className="p-4 border-b border-zinc-200 bg-white">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Find community..."
                className="input h-10 text-xs w-full"
                style={{ paddingLeft: '36px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCommunities.map(c => (
              <div 
                key={c.id} 
                draggable={!!c.latitude}
                onDragStart={(e) => handleDragStart(e, c.id)}
                className={`relative p-3 border border-transparent rounded-xl transition group ${c.latitude ? 'hover:bg-white hover:shadow-sm hover:border-zinc-300 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                title={!c.latitude ? 'Pin this community first to enable scheduling' : ''}
              >
                <div 
                  className="absolute inset-0 z-10" 
                  onClick={(e) => {
                    e.stopPropagation();
                    const existingTask = tasks.find(t => t.community_id === c.id);
                    if (existingTask) {
                      setSelectedTask(existingTask);
                    } else if (c.latitude) {
                      setSelectedTask({
                        community_id: c.id,
                        community: c,
                        status: 'Pending',
                        service_method: 'Both'
                      });
                    }
                  }}
                />
                <div className="relative z-0">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-extrabold text-zinc-900 leading-tight">{c.name}</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{c.company}</span>
                  </div>
                  <div className="flex gap-1">
                    {c.isRecentlyServiced && <div className="w-2 h-2 rounded-full bg-blue-400" title="Serviced in last 7 days" />}
                    {c.latitude ? (
                      <div className="w-2 h-2 rounded-full bg-emerald-500" title="Pinned" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-zinc-300" title="Unmapped" />
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                   <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">
                     {(c.square_footage / 43560).toFixed(1)} Acres
                   </span>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div 
          className="flex flex-1 overflow-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* Map View */}
          <div 
            className="flex-1 bg-zinc-100 relative overflow-hidden"
            style={{ 
              visibility: (viewMode === 'split' || viewMode === 'map') ? 'visible' : 'hidden',
              position: (viewMode === 'split' || viewMode === 'map') ? 'relative' : 'absolute',
              height: (viewMode === 'split' || viewMode === 'map') ? '100%' : '0',
            }}
          >
            <PlanningMap 
              communities={filteredCommunities} 
              tasks={tasks}
              onTaskSelect={(stagedTask: any) => {
                const existing = tasks.find(t => String(t.community_id) === String(stagedTask.community_id));
                console.log('Map Selection:', existing ? 'Existing Task Found' : 'New Task Staged', existing || stagedTask);
                if (existing) {
                  setSelectedTask({...existing});
                } else {
                  setSelectedTask({...stagedTask});
                }
              }}
              highlightedId={selectedTask?.community_id}
              center={selectedTask?.community ? [selectedTask.community.latitude, selectedTask.community.longitude] : undefined}
            />
          </div>

          {/* Right Sidebar: Daily Schedule (Timeline) */}
          {(viewMode === 'split' || viewMode === 'list') && (
            <div className={`${viewMode === 'list' ? 'flex-1' : 'w-96'} border-l border-zinc-200 bg-white flex flex-col shadow-2xl z-10`}>
              <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
                 <div>
                   <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tighter">Planned Schedule</h2>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase">{tasks.length} Communities assigned</p>
                 </div>
                 <button className="btn btn-ghost p-2"><Filter size={16} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {tasks.length === 0 ? (
                   <div className="py-20 text-center flex flex-col items-center gap-4 px-8">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-300">
                        <List size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-400">No schedule created for this day.</p>
                        <p className="text-[11px] text-zinc-300 mt-1">Drag and drop communities here or use the "Add Visit" button to begin.</p>
                      </div>
                   </div>
                 ) : (
                   tasks.map((task, i) => (
                     <div 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className="group relative bg-white border border-zinc-200 rounded-[24px] p-5 hover:border-zinc-400 cursor-pointer transition-all shadow-sm hover:shadow-md"
                     >
                        <div className="flex items-start justify-between mb-3">
                           <div className="flex gap-3 items-center">
                              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-xs">
                                 {i + 1}
                              </div>
                              <div>
                                 <div className="text-sm font-black text-zinc-900 leading-tight">{task.community?.name}</div>
                                 <div className="text-[10px] font-bold text-zinc-400 uppercase">{task.community?.company}</div>
                              </div>
                           </div>
                           <button 
                             title="Remove from schedule"
                             className="p-2 -mr-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               setConfirmDeleteId(task.id); 
                             }}
                            >
                             <X size={16} />
                           </button>
                        </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${task.service_method === 'Spray' ? 'border-blue-200 text-blue-600 bg-blue-50' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                            {task.service_method}
                         </span>
                         {task.is_fixed && (
                           <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-rose-200 text-rose-600 bg-rose-50 italic">
                             Fixed Date
                           </span>
                         )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-zinc-500 line-clamp-2 italic leading-relaxed">
                          {task.procedure_notes || 'No visit notes added yet.'}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                         <div className="flex items-center gap-1">
                            <CheckCircle2 size={12} className={task.status === 'Completed' ? 'text-emerald-500' : 'text-zinc-200'} />
                            {task.status}
                         </div>
                         <div className="text-zinc-300">
                           {task.photo_urls?.length || 0} Photos
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal (Custom Replacement for window.confirm) */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmDeleteId(null)} />
           <div className="relative z-10 w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl animate-fade-up p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6">
                 <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Remove Visit?</h3>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed mb-8">
                Are you sure you want to remove this community from today's schedule? This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={() => deleteTask(confirmDeleteId)}
                  className="btn btn-primary bg-rose-600 hover:bg-rose-700 border-none h-12 rounded-2xl font-bold w-full"
                 >
                   Yes, Remove Visit
                 </button>
                 <button 
                  onClick={() => setConfirmDeleteId(null)}
                  className="btn btn-ghost h-12 rounded-2xl font-bold text-zinc-400 w-full"
                 >
                   Nevermind
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Edit Task Drawer/Modal */}
      {selectedTask && (
        <VisitDetailsModal 
          task={selectedTask}
          settings={settings}
          selectedDate={selectedDate}
          isSaving={isSavingTask}
          onClose={() => setSelectedTask(null)}
          onSave={(updated) => updateTask(updated)}
          onDelete={(id) => setConfirmDeleteId(id)}
          onTranslate={translateProcedure}
          isTranslating={isTranslating}
        />
      )}
    </div>
  </div>
);
}

/**
 * Isolated Modal Component to prevent Dashboard re-renders on entry
 */
function VisitDetailsModal({ task, settings, selectedDate, isSaving, onClose, onSave, onDelete, onTranslate, isTranslating }: any) {
  const [localTask, setLocalTask] = useState(task);

  // Sync if task prop changes externally (e.g. selection change)
  useEffect(() => {
    setLocalTask(task);
  }, [task.id, task.community_id]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
       <div className="relative z-10 w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl animate-fade-up">
          <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
             <div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Editing Planned Visit</div>
                <h3 className="text-xl font-black text-zinc-900">{localTask.community?.name}</h3>
             </div>
             <button onClick={onClose} className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zinc-400 hover:text-zinc-900 border border-zinc-200 transition">
                <X size={20} />
             </button>
          </div>

          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Service Method</label>
                   <select 
                    className="input h-11 text-xs font-bold py-0"
                    style={{ paddingLeft: 12, paddingRight: 32 }}
                    value={localTask.service_method}
                    onChange={(e) => setLocalTask({...localTask, service_method: e.target.value})}
                   >
                      {(settings.service_methods || [
                        { label: 'Spray & Granular', value: 'Both' },
                        { label: 'Spray Only', value: 'Spray' },
                        { label: 'Granular Only', value: 'Granular' }
                      ]).map((method: any) => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Fixed Date?</label>
                   <div className="flex items-center gap-3 h-10 px-2">
                      <input 
                        type="checkbox" 
                        checked={localTask.is_fixed}
                        onChange={(e) => setLocalTask({...localTask, is_fixed: e.target.checked})}
                        className="w-4 h-4 rounded accent-zinc-900"
                      />
                      <span className="text-xs font-bold text-zinc-600">Must be done today</span>
                   </div>
                </div>
             </div>

             <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Procedure Notes (English)</label>
                   <button 
                     onClick={() => onTranslate(localTask, (translated: string) => setLocalTask((prev: any) => ({...prev, spanish_notes: translated})))}
                     disabled={isTranslating}
                     className="text-[10px] font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg"
                   >
                     {isTranslating ? <RotateCcw size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
                     Translate to Spanish
                   </button>
                </div>
                <textarea 
                  className="input min-h-[80px] text-xs leading-relaxed py-3"
                  placeholder="Enter detailed maintenance instructions..."
                  value={localTask.procedure_notes || ''}
                  onChange={(e) => setLocalTask({...localTask, procedure_notes: e.target.value})}
                />
             </div>

             <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 font-mono text-zinc-500">Spanish Briefing</label>
                <textarea 
                  className="input min-h-[80px] text-xs leading-relaxed py-3 bg-zinc-50 border-dashed border-zinc-200"
                  placeholder="Spanish translation will appear here..."
                  value={localTask.spanish_notes || ''}
                  onChange={(e) => setLocalTask({...localTask, spanish_notes: e.target.value})}
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Priority Areas</label>
                   <input 
                    type="text"
                    className="input h-11 text-xs"
                    placeholder="e.g. Front Entrance, Pool"
                    value={localTask.priority_areas || ''}
                    onChange={(e) => setLocalTask({...localTask, priority_areas: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Priority Tasks</label>
                   <input 
                    type="text"
                    className="input h-11 text-xs"
                    placeholder="e.g. Dead patch repair"
                    value={localTask.priority_tasks || ''}
                    onChange={(e) => setLocalTask({...localTask, priority_tasks: e.target.value})}
                   />
                </div>
             </div>
          </div>

          <div className="p-8 bg-zinc-50 border-t border-zinc-100 flex justify-between gap-4">
              <button 
               onClick={() => {
                 if (localTask.id) {
                   onDelete(localTask.id);
                 } else {
                   onClose();
                 }
               }}
               className="btn btn-ghost text-red-500 border-red-100 hover:bg-red-50 flex-1 h-12 rounded-2xl"
              >
                {localTask.id ? 'Delete' : 'Cancel'}
              </button>
             <button 
              onClick={() => {
                generateBriefingPDF({
                  communityName: localTask.community?.name,
                  company: localTask.community?.company,
                  date: selectedDate,
                  acres: (localTask.community?.square_footage / 43560).toFixed(1),
                  procedureNotes: localTask.procedure_notes,
                  spanishNotes: localTask.spanish_notes,
                  priorityAreas: localTask.priority_areas,
                  priorityTasks: localTask.priority_tasks,
                  serviceMethod: localTask.service_method
                });
              }}
              className="btn btn-ghost border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex-1 h-12 rounded-2xl flex items-center justify-center gap-2"
             >
               <FileText size={18} /> Briefing PDF
             </button>
             <button 
              onClick={() => onSave(localTask)}
              disabled={isSaving}
              className="btn btn-primary flex-1 h-12 rounded-2xl flex justify-center"
             >
               {isSaving ? 'Saving...' : 'Save Notes'}
             </button>
          </div>
       </div>
    </div>
  );
}
