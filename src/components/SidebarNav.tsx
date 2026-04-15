'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import {
  LayoutGrid,
  Building2,
  ClipboardList,
  BarChart3,
  Package,
  LogOut,
  Settings,
  RefreshCcw,
  Loader2
} from "lucide-react";
import { useData } from "@/context/DataContext";

const NAV = [
  { href: "/dashboard", icon: BarChart3, label: "Dashboard", permission: 'can_view_financials' },
  { href: "/", icon: LayoutGrid, label: "Overview", permission: 'can_view_dashboard' },
  { href: "/communities", icon: Building2, label: "Community Portfolio", permission: 'can_view_dashboard' },
  { href: "/inventory", icon: Package, label: "Materials & Labor", permission: 'can_view_dashboard' },
  { href: "/reports", icon: ClipboardList, label: "Reports", permission: 'can_view_dashboard' },
  { href: "/log", icon: ClipboardList, label: "Record Service", permission: 'can_log_service' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { profile, loading: authLoading } = useUser();
  const { loading: dataLoading, lastRefreshed, refreshData } = useData();

  if (authLoading) return <div style={{ padding: 24, fontSize: 11, color: 'var(--text-subtle)' }}>Verifying access...</div>;

  const filteredNav = NAV.filter(item => {
    if (!profile?.role) return false;
    return (profile.role as any)[item.permission];
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const minutesAgo = lastRefreshed ? Math.round((Date.now() - lastRefreshed) / 60000) : null;
  const isLive = minutesAgo !== null && minutesAgo < 2;
  const statusLabel = dataLoading ? 'Syncing...' : isLive ? 'Live Data' : 'Cached Data';
  const statusSub = dataLoading
    ? 'Fetching latest records'
    : minutesAgo !== null
    ? `Synced ${minutesAgo}m ago`
    : 'Not yet synced';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <nav style={{ padding: "0 12px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {filteredNav.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          
          return (
            <Link 
              key={href} 
              href={href} 
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={href === '/log' ? {
                background: isActive ? 'var(--highlight)' : 'var(--highlight-dim)',
                color: isActive ? '#ffffff' : 'var(--highlight)',
                border: isActive ? 'none' : '1px solid var(--highlight-border)',
                fontWeight: 700,
                boxShadow: isActive ? '0 4px 12px rgba(217, 119, 6, 0.25)' : 'none',
                marginTop: 12,
                marginBottom: 12
              } : {}}
            >
              <Icon size={15} style={href === '/log' && isActive ? { color: '#ffffff' } : {}} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '8px 12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        {/* Sync Status Panel */}
        <div style={{ padding: '14px 16px', marginBottom: 12, background: 'var(--surface-sunken, #f8fafc)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                {statusLabel}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)' }}>
                {statusSub}
              </div>
            </div>
            <button 
              onClick={() => refreshData()}
              disabled={dataLoading}
              title="Refresh data"
              style={{ 
                color: 'var(--text-muted)', 
                background: 'transparent',
                border: 'none',
                padding: 4,
                cursor: dataLoading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6,
                opacity: dataLoading ? 0.5 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              {dataLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
            </button>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="sidebar-link" 
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
        <Link 
          href="/settings"
          className={`sidebar-link ${pathname === '/settings' ? 'active' : ''}`}
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <Settings size={15} />
          Settings
        </Link>
      </div>
    </div>
  );
}
