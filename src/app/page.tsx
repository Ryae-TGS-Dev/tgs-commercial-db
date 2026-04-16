'use client';

import { TrendingUp, Building2, ClipboardList, Activity } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: '40px 48px', maxWidth: 1600, margin: '0 auto' }} className="space-y-12 animate-in fade-in duration-700">
      {/* Hero Bar */}
      <div className="bg-[#09090b] text-white rounded-[40px] p-16 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 border border-zinc-800 relative overflow-hidden">
        <div className="fade-up">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-amber-500/10 text-amber-500 p-3 rounded-2xl"><Activity size={24} /></div>
            <h1 className="text-6xl font-black tracking-tighter leading-none">Management Dashboard</h1>
          </div>
          <p className="text-zinc-300 text-lg font-medium max-w-xl leading-relaxed">Your professional suite for commercial property maintenance forensics, operational yield tracking, and performance analytics.</p>
        </div>
        <div className="flex gap-4 relative z-10">
          {/* Action buttons removed for cleaner redundancy-free layout */}
        </div>

        {/* Subtle Background Ornament */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-zinc-900/50 to-transparent pointer-events-none" />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Link href="/analytics" className="group p-10 rounded-[40px] border border-zinc-100 bg-white hover:border-zinc-900 transition-all shadow-sm">
          <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 mb-8 group-hover:bg-zinc-900 group-hover:text-white transition-all">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-3xl font-black mb-3 tracking-tight text-zinc-900">Analytics</h3>
          <p className="text-zinc-500 text-sm leading-relaxed font-medium">Review the net operational yield and efficiency benchmarks across your entire managed portfolio.</p>
        </Link>
        
        <Link href="/communities" className="group p-10 rounded-[40px] border border-zinc-100 bg-white hover:border-zinc-900 transition-all shadow-sm">
          <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 mb-8 group-hover:bg-zinc-900 group-hover:text-white transition-all">
            <Building2 size={24} />
          </div>
          <h3 className="text-3xl font-black mb-3 tracking-tight text-zinc-900">Community Portfolio</h3>
          <p className="text-zinc-500 text-sm leading-relaxed font-medium">Manage property profiles, footprint tracking (SQFT), and specific operational service history.</p>
        </Link>

        <Link href="/reports" className="group p-10 rounded-[40px] border border-zinc-100 bg-white hover:border-zinc-900 transition-all shadow-sm">
          <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 mb-8 group-hover:bg-zinc-900 group-hover:text-white transition-all">
            <ClipboardList size={24} />
          </div>
          <h3 className="text-3xl font-black mb-3 tracking-tight text-zinc-900">Reports</h3>
          <p className="text-zinc-500 text-sm leading-relaxed font-medium">Deep-dive into granular material and labor reports for billing, reconciliation, and audit purposes.</p>
        </Link>
      </div>
    </div>
  );
}
