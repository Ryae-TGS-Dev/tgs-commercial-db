'use client';

import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  User, 
  Calendar, 
  Activity, 
  FileJson, 
  ChevronRight, 
  ChevronDown,
  ArrowRight,
  Download,
  Filter,
  RefreshCcw,
  Clock
} from 'lucide-react';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // States for filters
  const [filterUser, setFilterUser] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterType !== 'all') {
      query = query.eq('action', filterType);
    }
    
    // Server side fuzzy search isn't great without specialized config, 
    // we'll filter client side for user/record if needed or use full text if setup.
    // For now, simple fetch.

    const { data, error } = await query;
    if (error) console.error('Audit Load Error:', error);
    else setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'UPDATE': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'DELETE': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'DOWNLOAD': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterUser && !log.user_id?.toLowerCase().includes(filterUser.toLowerCase()) && !log.user_email?.toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (filterDate && !log.created_at.startsWith(filterDate)) return false;
    return true;
  });

  const renderDiff = (oldData: any, newData: any) => {
    if (!oldData || !newData) return null;
    
    // Find keys that changed
    const changedKeys = Object.keys(newData).filter(key => {
      return JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]);
    });

    if (changedKeys.length === 0) return <span className="text-zinc-400 italic">No field-level changes detected.</span>;

    return (
      <div className="space-y-3">
        {changedKeys.map(key => (
          <div key={key} className="flex flex-col gap-1">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{key}</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 font-mono line-through opacity-70">
                {typeof oldData[key] === 'object' ? JSON.stringify(oldData[key]) : String(oldData[key])}
              </span>
              <ArrowRight size={12} className="text-zinc-400" />
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold font-mono">
                {typeof newData[key] === 'object' ? JSON.stringify(newData[key]) : String(newData[key])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Filter by User ID/Action..." 
              className="input pl-10 h-10 text-xs" 
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            />
          </div>
          <select 
            className="input h-10 text-xs w-40"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="INSERT">Create (INSERT)</option>
            <option value="UPDATE">Edit (UPDATE)</option>
            <option value="DELETE">Remove (DELETE)</option>
            <option value="DOWNLOAD">Downloads</option>
          </select>
          <input 
            type="date" 
            className="input h-10 text-xs w-40"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-ghost h-10 px-4 flex items-center gap-2"
        >
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="border border-zinc-100 rounded-3xl overflow-hidden bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead className="bg-zinc-50/50 border-b border-zinc-100">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-[20%]">Timestamp</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-[15%]">User</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-[10%]">Action</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest w-[15%]">Entity</th>
              <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Details</th>
              <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest w-[80px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <RefreshCcw size={32} className="animate-spin text-zinc-200 mx-auto" />
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-zinc-400 font-medium">No audit entries found match your criteria.</td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <Fragment key={log.id}>
                  <tr className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-500 font-mono text-[11px] font-bold">
                        <Clock size={12} className="text-zinc-300" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <User size={12} />
                        </div>
                        <span className="text-xs font-bold text-zinc-900 truncate max-w-[120px]" title={log.user_id}>
                          {log.user_id?.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-black text-zinc-800 uppercase tracking-tighter">{log.table_name || 'System'}</span>
                        <span className="text-[10px] font-mono text-zinc-400">ID: {log.record_id?.substring(0, 8) || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-600 truncate max-w-sm">
                        {log.action === 'UPDATE' ? 'Updated record fields' : 
                         log.action === 'DOWNLOAD' ? `Downloaded: ${log.metadata?.report_name}` :
                         log.action === 'INSERT' ? 'Created new record entry' : 'Removed record from database'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(log.old_data || log.new_data || log.metadata) && (
                        <button 
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="p-2 rounded-lg hover:bg-zinc-200/50 text-zinc-400 hover:text-zinc-900 transition"
                        >
                          {expandedId === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-zinc-50/30">
                      <td colSpan={6} className="px-8 py-6 border-b border-zinc-100 shadow-inner">
                        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                          {log.action === 'UPDATE' ? (
                            <div>
                               <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-2">
                                 <RefreshCcw size={14} className="text-blue-500" />
                                 <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">Change Log Diff</h4>
                               </div>
                               {renderDiff(log.old_data, log.new_data)}
                            </div>
                          ) : log.action === 'DOWNLOAD' ? (
                            <div>
                               <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-2">
                                 <Download size={14} className="text-amber-500" />
                                 <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">Download Metadata</h4>
                               </div>
                               <pre className="text-[10px] p-3 rounded-lg bg-zinc-50 text-zinc-600 font-mono overflow-auto">
                                 {JSON.stringify(log.metadata, null, 2)}
                               </pre>
                            </div>
                          ) : (
                            <div>
                               <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-2">
                                 <FileJson size={14} className="text-zinc-500" />
                                 <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">Full Record Snapshot</h4>
                               </div>
                               <pre className="text-[10px] p-3 rounded-lg bg-zinc-50 text-zinc-600 font-mono overflow-auto max-h-40">
                                 {JSON.stringify(log.new_data || log.old_data, null, 2)}
                               </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-center p-4">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
           Retention Policy: Showing last 200 entries • Indexed by Supabase Realtime
        </p>
      </div>
    </div>
  );
}
