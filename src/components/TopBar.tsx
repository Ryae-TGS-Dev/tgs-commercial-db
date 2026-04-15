'use client';

import { useUser } from '@/hooks/useUser';
import { useData } from '@/context/DataContext';
import { RefreshCcw, Loader2 } from 'lucide-react';

export function TopBar() {
  const { profile } = useUser();
  const { loading: dataLoading, lastRefreshed, refreshData } = useData();

  const minutesAgo = lastRefreshed ? Math.round((Date.now() - lastRefreshed) / 60000) : null;
  const isLive = minutesAgo !== null && minutesAgo < 2;

  const statusLabel = dataLoading ? 'Syncing...' : isLive ? 'Live Data' : minutesAgo !== null ? 'Cached Data' : 'Not Synced';
  const statusSub   = dataLoading
    ? 'Fetching latest...'
    : minutesAgo !== null
    ? `Synced ${minutesAgo}m ago`
    : 'No sync yet';

  const accessLabel = profile?.role?.can_manage_system
    ? 'Full Access'
    : profile?.role?.can_log_service
    ? 'Field Access'
    : profile?.role
    ? 'Read Only'
    : null;

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 20,
      padding: '10px 32px',
      height: 52,
    }}>
      {/* Sync Status */}
      <button
        onClick={() => refreshData()}
        disabled={dataLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'none',
          border: 'none',
          cursor: dataLoading ? 'default' : 'pointer',
          padding: '6px 10px',
          borderRadius: 8,
        }}
        title="Click to refresh data"
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1 }}>
            {statusLabel}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-subtle)', marginTop: 3 }}>
            {statusSub}
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', opacity: dataLoading ? 0.4 : 0.7 }}>
          {dataLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
        </div>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

      {/* User Identity */}
      {profile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {profile.full_name || 'User'}
            </div>
            {accessLabel && (
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>
                {accessLabel}
              </div>
            )}
          </div>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'var(--accent)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 900,
            flexShrink: 0,
            boxShadow: '0 4px 12px -2px rgba(217,119,6,0.3)',
          }}>
            {profile.full_name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}
    </div>
  );
}
