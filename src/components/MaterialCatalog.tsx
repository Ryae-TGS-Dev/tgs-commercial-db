'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { EditProductModal } from './EditProductModal';

export function MaterialCatalog({ initialProducts = [], isEditable }: { initialProducts: any[]; isEditable: boolean }) {
  const products = initialProducts || [];
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Derive categories automatically if 'category' column exists, else assume empty or basic
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Uncategorized'))).sort() as string[]];

  const filtered = products.filter(p => {
    const matchSearch = p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'All' || (p.category || 'Uncategorized') === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div>
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by SKU or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full py-2 text-sm"
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-zinc-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input py-2 text-sm font-semibold"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto w-full relative">
        <table className="tgs-table">
          <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10 shadow-sm border-b">
            <tr>
              <th>SKU / Material Name</th>
              <th>Category</th>
              <th>Unit Price ($)</th>
              <th>Coverage (SQFT)</th>
              {isEditable && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any) => (
              <tr key={p.sku}>
                <td className="font-semibold">{p.sku}</td>
                <td>
                  <span className="badge badge-neutral text-xs">{p.category || 'Uncategorized'}</span>
                </td>
                <td className="text-zinc-700 font-semibold font-mono">
                  ${parseFloat(p.unit_price).toFixed(2)}
                </td>
                <td className="text-zinc-500 text-sm">{p.coverage_sqft ? p.coverage_sqft.toLocaleString() + ' sqft' : '—'}</td>
                {isEditable && (
                  <td className="text-right">
                    <EditProductModal product={p} />
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 5 : 4} className="text-center p-10 text-zinc-500 text-sm">
                  No materials match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
