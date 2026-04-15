'use client';

import { useState } from 'react';
import { CommunityDrawer } from './CommunityDrawer';

export function ActivityTimelineClient({ activities }: { activities: any[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {activities.map((r: any, i: number) => {
          const communityName = r.communities?.name || r.source_community_name;
          const communityId = r.communities?.id || r.community_id;
          
          return (
            <div key={i} className="card-hover" style={{ padding: "20px 24px", background: 'white', borderRadius: 20, border: '1px solid var(--border-subtle)', display: "flex", alignItems: "center", gap: 20, transition: 'all 0.2s' }}>
               <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                  {new Date(r.service_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }).split(' ').map((s: string, idx: number) => <div key={idx}>{s}</div>)}
               </div>
               <div style={{ flex: 1 }}>
                  <button 
                    onClick={() => communityId && setSelectedId(communityId)}
                    disabled={!communityId}
                    style={{ 
                      fontWeight: 800, 
                      fontSize: 15, 
                      color: 'var(--text)', 
                      marginBottom: 2, 
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: communityId ? 'pointer' : 'default'
                    }}
                    className={communityId ? "hover:underline underline-offset-2 hover:text-zinc-600" : ""}
                  >
                    {communityName}
                  </button>
                  <div style={{ fontSize: 13, color: "var(--text-subtle)", fontWeight: 500 }}>{r.service_performed}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase' }}>
                {r.service_category || 'Visit'}
              </div>
            </div>
          );
        })}
      </div>

      <CommunityDrawer 
        communityId={selectedId} 
        onClose={() => setSelectedId(null)} 
      />
    </>
  );
}
