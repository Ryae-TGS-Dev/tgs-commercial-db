'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Eye } from 'lucide-react';

export function RoleToggle() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null); // null = loading

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const roleCookie = cookies.find(c => c.trim().startsWith('tgs_role='));
    // Default is 'executive' (read-only) — must explicitly enable power_user
    setRole(roleCookie ? roleCookie.split('=')[1].trim() : 'executive');
  }, []);

  const handleRoleChange = (newRole: string) => {
    document.cookie = `tgs_role=${newRole}; path=/; max-age=31536000`;
    setRole(newRole);
    router.refresh();
  };

  if (role === null) return <div style={{ height: 36 }} />;

  const isPowerUser = role === 'power_user';

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button
        onClick={() => handleRoleChange('executive')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          border: `1px solid ${!isPowerUser ? 'var(--border)' : 'var(--border)'}`,
          background: !isPowerUser ? 'var(--surface-2)' : 'transparent',
          color: !isPowerUser ? 'var(--text)' : 'var(--text-muted)',
          cursor: isPowerUser ? 'pointer' : 'default',
          transition: 'all 0.15s',
        }}
      >
        <Eye size={14} />
        Executive View
        {!isPowerUser && (
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', padding: '1px 6px', borderRadius: 10 }}>
            ACTIVE
          </span>
        )}
      </button>

      <button
        onClick={() => isPowerUser ? undefined : handleRoleChange('power_user')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          border: `1px solid ${isPowerUser ? 'var(--accent-border)' : 'var(--border)'}`,
          background: isPowerUser ? 'var(--accent-dim)' : 'transparent',
          color: isPowerUser ? 'var(--accent)' : 'var(--text-muted)',
          cursor: isPowerUser ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <ShieldCheck size={14} />
        Power User
        {isPowerUser && (
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', padding: '1px 6px', borderRadius: 10 }}>
            ACTIVE
          </span>
        )}
      </button>
    </div>
  );
}
