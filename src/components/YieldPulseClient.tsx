'use client';

import { useState } from 'react';
import { CommunityDrawer } from './CommunityDrawer';

interface Performer {
  id: string;
  name: string;
  marginPct: number;
}

export function YieldPulseClient({
  highPerformers,
  lowPerformers,
}: {
  highPerformers: Performer[];
  lowPerformers: Performer[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fmt = (n: number) => {
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Top Performing */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>
            Top Performing Communities
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {highPerformers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: '#f0fdf4', borderRadius: 12,
                  border: '1px solid #bbf7d0', width: '100%', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#dcfce7')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f0fdf4')}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{p.name}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#16a34a' }}>+{p.marginPct.toFixed(0)}%</div>
              </button>
            ))}
            {highPerformers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontStyle: 'italic' }}>No top performers yet.</div>
            )}
          </div>
        </div>

        {/* Critical Attention */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>
            Critical Attention Needed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lowPerformers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: '#fef2f2', borderRadius: 12,
                  border: '1px solid #fee2e2', width: '100%', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fecaca')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fef2f2')}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{p.name}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#dc2626' }}>{p.marginPct.toFixed(0)}%</div>
              </button>
            ))}
            {lowPerformers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', fontStyle: 'italic' }}>No alerts this morning.</div>
            )}
          </div>
        </div>
      </div>

      <CommunityDrawer
        communityId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
