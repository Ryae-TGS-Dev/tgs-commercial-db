'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Check, 
  X,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useData } from '@/context/DataContext';

export default function ManagementTable({ initialData, yields = [], onSelectCommunity }: { initialData: any[], yields?: any[], onSelectCommunity?: (id: string) => void }) {
  const { patchCommunity } = useData();
  const [data, setData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  useEffect(() => {
    if (initialData && initialData.length > 0) setData(initialData);
  }, [initialData]);

  const filteredData = data.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (id: string, val: any) => {
    setEditingId(id);
    setEditValue((val || 0).toString());
  };

  const saveEdit = async (id: string) => {
    const newVal = parseFloat(editValue);
    if (isNaN(newVal)) return;

    // 1. Instant Global Propagation (Optimistic)
    patchCommunity(id, { square_footage: newVal });
    setData(prev => prev.map(item => item.id === id ? { ...item, square_footage: newVal } : item));
    setEditingId(null);

    // 2. Persistent Database Sync
    const { error } = await supabase
      .from('communities')
      .update({ square_footage: newVal })
      .eq('id', id);

    if (error) console.error("Failed to sync edit to cloud:", error);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-700 transition-colors" />
        <input
          type="text"
          placeholder="Search communities or companies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-zinc-900/8 focus:border-zinc-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-200">
              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Community / Company</th>
              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Square Footage</th>
              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic text-center">
                <div className="flex items-center justify-center gap-1 group/info relative cursor-help">
                  Application Precision
                  <div className="w-3 h-3 rounded-full border border-zinc-300 flex items-center justify-center text-[8px] font-black group-hover/info:border-zinc-600 group-hover/info:text-zinc-600 transition-colors">i</div>

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover/info:block w-48 p-3 bg-zinc-900 text-[10px] font-bold text-white leading-relaxed rounded-xl shadow-xl z-50 normal-case tracking-normal">
                    <div className="text-zinc-100 mb-1">100% = Bullseye</div>
                    <div className="text-zinc-400 mb-1"><span className="text-rose-400">Low %</span> = Over-Applied / Waste</div>
                    <div className="text-zinc-400"><span className="text-amber-400">High %</span> = Under-Applied / Low Coverage</div>
                  </div>
                </div>
              </th>
              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic text-center">Status</th>
              <th className="p-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest italic text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {paginatedData.map((c) => {
              const y = yields.find(y => y.id === c.id);
              const hasData = y && y.appEfficiency !== null;
              const eff = y?.appEfficiency || 0;
              const isPrecision = eff >= 90 && eff <= 110;
              const isOver = eff < 90;
              const isUnder = eff > 110;

              return (
                <tr key={c.id} className="group hover:bg-zinc-50 transition-colors">
                  <td className="p-6">
                    {onSelectCommunity ? (
                      <button
                        onClick={() => onSelectCommunity(c.id)}
                        className="text-left group/name"
                      >
                        <div className="font-extrabold text-zinc-900 group-hover/name:text-zinc-600 group-hover/name:underline underline-offset-2 transition-colors">{c.name}</div>
                        <div className="text-xs text-zinc-400 font-medium">{c.company || 'Direct'}</div>
                      </button>
                    ) : (
                      <div>
                        <div className="font-extrabold text-zinc-900">{c.name}</div>
                        <div className="text-xs text-zinc-400 font-medium">{c.company || 'Direct'}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-6">
                    {editingId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 p-2 bg-white border border-zinc-400 rounded-lg text-xs font-bold focus:outline-none focus:border-zinc-700"
                          autoFocus
                        />
                        <button onClick={() => saveEdit(c.id)} className="p-1 text-zinc-700 hover:bg-zinc-100 rounded-md">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-md">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEdit(c.id, c.square_footage)}
                        className="inline-flex items-center gap-2 cursor-pointer hover:bg-zinc-100 px-3 py-1.5 rounded-lg transition-colors group/edit"
                      >
                        <span className="font-mono text-sm font-bold text-zinc-700">{(c.square_footage || 0).toLocaleString()}</span>
                        <span className="text-[10px] font-black text-zinc-400">SQFT</span>
                        <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    {hasData ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPrecision ? <Check className="w-3 h-3 text-emerald-500" /> : isOver ? <TrendingDown className="w-3 h-3 text-rose-500" /> : <TrendingUp className="w-3 h-3 text-amber-500" />}
                          <span className={`font-bold text-xs ${isPrecision ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'}`}>
                            {eff.toFixed(0)}%
                          </span>
                        </div>
                        {isOver && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Wasting Product</span>}
                        {isUnder && <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Low Coverage</span>}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">No Applications</span>
                    )}
                  </td>
                  <td className="p-6 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onSelectCommunity?.(c.id)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all group/view relative"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/view:block px-2 py-1 bg-zinc-900 text-white text-[8px] font-black uppercase rounded shadow-xl whitespace-nowrap z-50">View Details</span>
                      </button>
                      <button className="p-2 text-zinc-300 hover:text-zinc-700 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/30">
            <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
