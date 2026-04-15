'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  Shield, 
  Check, 
  X, 
  Loader2, 
  Unlock,
  UserPlus,
  Trash2,
  Clock,
  Plus,
  ShieldCheck
} from 'lucide-react';

export function IdentityManager() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'invites'>('users');
  const [saving, setSaving] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [newInvite, setNewInvite] = useState({ email: '', role_id: '' });
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  useEffect(() => { setMounted(true); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const [rolesRes, profilesRes, invitesRes] = await Promise.all([
      supabase.from('app_roles').select('*').order('name'),
      supabase.from('profiles').select('*, role:app_roles(*)').order('email'),
      supabase.from('team_invites').select('*, role:app_roles(*)').order('created_at', { ascending: false })
    ]);
    if (rolesRes.data) setRoles(rolesRes.data);
    if (profilesRes.data) {
      setProfiles(profilesRes.data);
      setCurrentUser(profilesRes.data.find((p: any) => p.id === session?.user.id));
    }
    if (invitesRes.data) setInvites(invitesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const togglePermission = async (roleId: string, field: string, current: boolean) => {
    const role = roles.find(r => r.id === roleId);
    if (role?.is_primary_admin && (field === 'can_manage_system' || field === 'can_view_dashboard') && current) {
      alert("System Protected: Primary Administrator must keep Admin and Dashboard access.");
      return;
    }
    setSaving(roleId + field);
    await supabase.from('app_roles').update({ [field]: !current }).eq('id', roleId);
    await fetchData();
    setSaving(null);
  };

  const updateRole = async (userId: string, roleId: string) => {
    const targetRole = roles.find(r => r.id === roleId);
    if (userId === currentUser?.id && !targetRole?.is_primary_admin) {
      alert("Safety Lock: You cannot demote yourself. Another Primary Admin must perform this action.");
      return;
    }
    setSaving(userId);
    await supabase.from('profiles').update({ role_id: roleId }).eq('id', userId);
    await fetchData();
    setSaving(null);
  };

  const handleDeleteUser = async (user: any) => {
    if (user.role?.is_primary_admin) return;
    if (!confirm(`Remove ${user.email} from the system?`)) return;
    setSaving(user.id);
    await supabase.from('profiles').delete().eq('id', user.id);
    await fetchData();
    setSaving(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 gap-3 text-zinc-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-xs font-black uppercase tracking-widest">Loading</span>
    </div>
  );

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      {/* Tab Bar */}
      <div className="flex bg-zinc-50 border-b border-zinc-100 p-1.5 gap-1">
        <TabBtn active={activeTab === 'users'} label="Team" onClick={() => setActiveTab('users')} icon={<Users size={13}/>} />
        <TabBtn active={activeTab === 'invites'} label="Pending Invites" onClick={() => setActiveTab('invites')} icon={<Clock size={13}/>} />
        <TabBtn active={activeTab === 'roles'} label="Role Designer" onClick={() => setActiveTab('roles')} icon={<Shield size={13}/>} />
      </div>

      {/* Panel Header */}
      <div className="px-8 py-6 flex justify-between items-center border-b border-zinc-50">
        <div>
          <h3 className="font-extrabold text-zinc-900 text-lg">
            {activeTab === 'users' && 'Active Members'}
            {activeTab === 'invites' && 'Pending Invitations'}
            {activeTab === 'roles' && 'Permission Registry'}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {activeTab === 'users' && 'View, assign roles, and manage team members.'}
            {activeTab === 'invites' && 'Invitations expire 24 hours after being sent.'}
            {activeTab === 'roles' && 'Toggle which features each role can access.'}
          </p>
        </div>
        {currentUser?.role?.is_primary_admin && (
          <button 
            onClick={() => activeTab === 'roles' ? setShowRoleModal(true) : setShowInviteModal(true)}
            className="bg-zinc-900 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            <Plus size={15}/>
            {activeTab === 'roles' ? 'Create Role' : 'Invite Member'}
          </button>
        )}
      </div>

      {/* Panel Body */}
      <div className="p-8">
        {/* ── TEAM TAB ── */}
        {activeTab === 'users' && (
          <table className="tgs-table w-full">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-sm">
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <input
                            className="font-bold text-sm text-zinc-900 bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-400 focus:outline-none transition-colors"
                            defaultValue={user.full_name || 'Team Member'}
                            onBlur={(e) => {
                              if (e.target.value !== user.full_name) {
                                supabase.from('profiles').update({ full_name: e.target.value }).eq('id', user.id).then(fetchData);
                              }
                            }}
                          />
                          {user.role?.is_primary_admin && (
                            <span className="text-[9px] font-extrabold uppercase bg-zinc-900 text-white px-1.5 py-0.5 rounded tracking-wide">Primary</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="text-xs font-bold bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 outline-none focus:ring-2 ring-zinc-200"
                      value={user.role_id || ''}
                      disabled={saving === user.id || !currentUser?.role?.is_primary_admin || (user.role?.is_primary_admin && user.id !== currentUser?.id)}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="text-right">
                    {currentUser?.role?.is_primary_admin && !user.role?.is_primary_admin && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={saving === user.id}
                        className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        {saving === user.id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── INVITES TAB ── */}
        {activeTab === 'invites' && (
          <div className="space-y-3">
            {invites.map(inv => {
              const hoursLeft = Math.max(0, (new Date(inv.expires_at).getTime() - Date.now()) / 3_600_000);
              const expired = hoursLeft === 0;
              return (
                <div key={inv.id} className="flex items-center justify-between bg-zinc-50 rounded-2xl px-5 py-4 border border-zinc-100">
                  <div>
                    <div className="font-bold text-sm text-zinc-900">{inv.email}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">Role: <span className="font-bold text-zinc-600">{inv.role?.name}</span></div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold ${expired ? 'text-red-500' : 'text-zinc-400'}`}>
                      {expired ? 'Expired' : `${Math.floor(hoursLeft)}h remaining`}
                    </span>
                    <button onClick={() => supabase.from('team_invites').delete().eq('id', inv.id).then(fetchData)} className="text-zinc-300 hover:text-red-500 transition-colors">
                      <X size={16}/>
                    </button>
                  </div>
                </div>
              );
            })}
            {invites.length === 0 && (
              <div className="text-center py-16 text-zinc-500 text-sm italic">No pending invitations.</div>
            )}
          </div>
        )}

        {/* ── ROLES TAB ── */}
        {activeTab === 'roles' && (
          <div className="space-y-8">
            {roles.map(role => (
              <div key={role.id} className="border border-zinc-100 rounded-2xl p-6">
                <div className="mb-5 pb-4 border-b border-zinc-50">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-zinc-900">{role.name}</h4>
                    {role.is_primary_admin && (
                      <span className="text-[9px] font-extrabold uppercase bg-zinc-900 text-white px-2 py-0.5 rounded tracking-widest">System Primary</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{role.description}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <ToggleBtn label="Dashboard" val={role.can_view_dashboard} loading={saving === role.id + 'can_view_dashboard'} onToggle={() => togglePermission(role.id, 'can_view_dashboard', role.can_view_dashboard)} />
                  <ToggleBtn label="Financials" val={role.can_view_financials} loading={saving === role.id + 'can_view_financials'} onToggle={() => togglePermission(role.id, 'can_view_financials', role.can_view_financials)} />
                  <ToggleBtn label="CSV Export" val={role.can_export_csv} loading={saving === role.id + 'can_export_csv'} onToggle={() => togglePermission(role.id, 'can_export_csv', role.can_export_csv)} />
                  <ToggleBtn label="Logging" val={role.can_log_service} loading={saving === role.id + 'can_log_service'} onToggle={() => togglePermission(role.id, 'can_log_service', role.can_log_service)} />
                  <ToggleBtn label="Pricing Edit" val={role.can_edit_pricing} loading={saving === role.id + 'can_edit_pricing'} onToggle={() => togglePermission(role.id, 'can_edit_pricing', role.can_edit_pricing)} />
                  <ToggleBtn label="Admin Access" val={role.can_manage_system} loading={saving === role.id + 'can_manage_system'} onToggle={() => togglePermission(role.id, 'can_manage_system', role.can_manage_system)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODALS via Portal (rendered at document.body level to escape overflow:hidden) ── */}
      {mounted && showInviteModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold mb-1">Invite Team Member</h3>
            <p className="text-sm text-zinc-500 mb-6">Invitations expire automatically after 24 hours.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5 block tracking-widest">Email Address</label>
                <input className="input w-full" placeholder="name@company.com" value={newInvite.email} onChange={(e) => setNewInvite({...newInvite, email: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5 block tracking-widest">Role</label>
                <select className="input w-full" value={newInvite.role_id} onChange={(e) => setNewInvite({...newInvite, role_id: e.target.value})}>
                  <option value="">Select role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-sm transition-colors">Cancel</button>
                <button
                  disabled={!newInvite.email || !newInvite.role_id || !!saving}
                  onClick={async () => {
                    setSaving('invite');
                    await supabase.from('team_invites').insert([{ email: newInvite.email, role_id: newInvite.role_id, invited_by: currentUser?.id }]);
                    setShowInviteModal(false);
                    setNewInvite({ email: '', role_id: '' });
                    await fetchData();
                    setSaving(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition-colors disabled:opacity-40"
                >
                  {saving === 'invite' ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && showRoleModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-extrabold mb-1">Create Custom Role</h3>
            <p className="text-sm text-zinc-500 mb-6">Define a new permission group. You can configure permissions after creation.</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5 block tracking-widest">Role Name</label>
                <input className="input w-full" placeholder="e.g. Field Analyst" value={newRole.name} onChange={(e) => setNewRole({...newRole, name: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5 block tracking-widest">Description</label>
                <textarea className="input w-full" rows={2} placeholder="Describe this role's responsibilities..." value={newRole.description} onChange={(e) => setNewRole({...newRole, description: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowRoleModal(false)} className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-sm transition-colors">Cancel</button>
                <button
                  disabled={!newRole.name || !!saving}
                  onClick={async () => {
                    setSaving('role');
                    await supabase.from('app_roles').insert([newRole]);
                    setShowRoleModal(false);
                    setNewRole({ name: '', description: '' });
                    await fetchData();
                    setSaving(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition-colors disabled:opacity-40"
                >
                  {saving === 'role' ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function TabBtn({ active, label, onClick, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all ${active ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
    >
      {icon} {label}
    </button>
  );
}

function ToggleBtn({ label, val, loading, onToggle }: any) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${val ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600'}`}
    >
      <div className="flex items-center gap-2.5">
        {val ? <ShieldCheck size={14} className="text-emerald-400 shrink-0"/> : <Shield size={14} className="shrink-0"/>}
        <span className="text-[11px] font-extrabold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? <Loader2 size={12} className="animate-spin opacity-50 shrink-0"/> : val && <Check size={12} className="text-emerald-400 shrink-0"/>}
    </button>
  );
}
