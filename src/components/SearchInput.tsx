'use client';

import { Search, Command } from 'lucide-react';
import { useState } from 'react';

export default function SearchInput() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full max-w-2xl mx-auto group">
      <div className={`
        flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-300
        ${isFocused 
          ? 'bg-white dark:bg-zinc-900 border-zinc-700 ring-4 ring-zinc-900/8 shadow-2xl scale-[1.02]' 
          : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'}
      `}>
        <Search className={`w-5 h-5 transition-colors ${isFocused ? 'text-zinc-700' : 'text-zinc-400'}`} />
        <input 
          type="text"
          placeholder="Search 400+ communities..."
          className="flex-1 bg-transparent border-none outline-none text-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <Command className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-500">K</span>
        </div>
      </div>
      
      {/* Mock Results - Just for the Idea Phase */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-3 p-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] font-bold text-zinc-400 px-3 py-2 uppercase tracking-wider">Suggested Communities</div>
          <button className="flex items-center gap-3 w-full px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 font-bold text-xs">AP</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Avalon Park</div>
              <div className="text-xs text-zinc-500">Southwest Florida • 42 Services in 2026</div>
            </div>
          </button>
          <button className="flex items-center gap-3 w-full px-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 font-bold text-xs">GH</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Greyhawk Estates</div>
              <div className="text-xs text-zinc-500">Naples • Next service tomorrow</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
