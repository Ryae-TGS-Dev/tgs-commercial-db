import { GuidelineEditor } from '@/components/GuidelineEditor';
import { GovernanceGrid } from '@/components/GovernanceGrid';
import { 
  Settings, 
  Shield, 
  Package, 
  Clock, 
  Users, 
  Building2, 
  Lock, 
  MessageSquareText, 
  ShieldCheck,
  Map
} from 'lucide-react';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EditProductModal } from '@/components/EditProductModal';
import { LaborRateEditor } from '@/components/LaborRateEditor';
import { CrewLeaderMerger } from '@/components/CrewLeaderMerger';
import { CompanyMerger } from '@/components/CompanyMerger';
import { MaterialCatalog } from '@/components/MaterialCatalog';
import { IdentityManager } from '@/components/IdentityManager';
import { PricingTimelineManager } from '@/components/PricingTimelineManager';
import { EfficiencyTargetEditor } from '@/components/EfficiencyTargetEditor';
import { LogisticsSettingsEditor } from '@/components/LogisticsSettingsEditor';
import { FinancialSettingsEditor } from '@/components/FinancialSettingsEditor';
import { AuditLogViewer } from '@/components/AuditLogViewer';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();

  // Fetch profile with role permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, role:app_roles(*)')
    .eq('id', session?.user.id)
    .single();

  const permissions = profile?.role || {};
  const isPowerUser = permissions.can_manage_system;

  const [{ data: products, error }, { data: settingsData }] = await Promise.all([
    supabase.from('products').select('*').order('sku'),
    supabase.from('app_settings').select('key, value'),
  ]);
  
  if (error) console.error('Error fetching materials/products:', error);

  const settingsMap = Object.fromEntries((settingsData || []).map((s: any) => [s.key, s.value]));
  const laborRate = parseFloat(settingsMap['labor_rate_per_hour'] || '32.50');

  return (
    <div style={{ padding: "40px 48px", width: '100%', margin: "0 auto" }}>
      {/* Header - Unified Styling */}
      <div className="fade-up mb-12 flex justify-between items-center">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <div style={{ background: '#18181b', padding: 8, borderRadius: 10, color: 'white' }}>
               <Settings size={18} />
             </div>
             <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: 0 }}>System Settings</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14, fontWeight: 500 }}>
            {isPowerUser
              ? 'Manage global configurations, pricing parameters, and system access levels.'
              : 'You are in Standard View — certain system settings are restricted based on your role.'}
          </p>
        </div>
        <div style={{ background: 'var(--surface-sunken)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Access Level</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} className="text-zinc-500" />
            <div style={{ fontSize: 13, fontWeight: 700 }}>{profile?.role?.name || 'Authorized Guest'}</div>
          </div>
        </div>
      </div>

      <div className="fade-up fade-up-1 flex flex-col gap-6">
        
        {/* Core Settings: Labor Rate & Standard Guidelines (Sensitive) */}
        {isPowerUser && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="card" style={{ padding: 20 }}>
                 <div className="flex items-center gap-2 mb-4">
                   <Clock size={16} className="text-orange-500" />
                   <h2 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-500">Financial Baseline</h2>
                 </div>
                 <LaborRateEditor currentRate={laborRate} />
                 
                 <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px dashed var(--border)' }}>
                   <PricingTimelineManager />
                 </div>
               </div>

              <div className="card" style={{ padding: 20 }}>
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquareText size={16} className="text-blue-500" />
                  <h2 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-500">Service Guidelines</h2>
                </div>
                <GuidelineEditor />

                <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px dashed var(--border)' }}>
                  <EfficiencyTargetEditor />
                </div>
              </div>

              {/* Logistics & Planning (New Building) */}
              <div className="card md:col-span-2" style={{ padding: 20 }}>
                <div className="flex items-center gap-2 mb-4">
                  <Map size={16} className="text-zinc-600" />
                  <h2 className="font-extrabold text-[10px] uppercase tracking-wider text-zinc-500">Logistics & Planning Parameters</h2>
                </div>
                <div className="mb-10">
              <div className="mb-6">
                <h2 className="text-xl font-black text-zinc-900">Planning & Logistics</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Configure scheduling thresholds and region parameters</p>
              </div>
              <LogisticsSettingsEditor />
            </div>

            <div className="pt-10 border-t border-zinc-100">
              <div className="mb-6">
                <h2 className="text-xl font-black text-zinc-900">Financial Intelligence</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Define overhead costs and profit margin health brackets</p>
              </div>
              <FinancialSettingsEditor />
            </div>
              </div>
            </div>

            {/* Team & Access Control (Identity) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <ShieldCheck size={20} className="text-zinc-600" />
                <h2 className="text-xl font-bold tracking-tight">Team & Access Control</h2>
              </div>
              <IdentityManager />
            </div>
          </>
        )}

        {/* Catalog & Inventory (Semi-Sensitive) */}
        {(isPowerUser || permissions.can_edit_pricing) && (
          <div className="card shadow-sm" style={{ padding: 24 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-zinc-500" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-zinc-700">Material Catalog</h2>
              </div>
            </div>
            <MaterialCatalog initialProducts={products || []} isEditable={permissions.can_edit_pricing} />
          </div>
        )}
        {/* Data Governance & Merging (Highly Sensitive) */}
        {isPowerUser && (
          <div className="card bg-zinc-50/50 border-dashed" style={{ padding: 24 }}>
            <div className="flex items-center gap-2 mb-6">
              <Shield size={18} className="text-zinc-400" />
              <h2 className="font-extrabold text-sm uppercase tracking-wider text-zinc-500">Data Governance & Normalization</h2>
            </div>
            
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={16} className="text-zinc-600" />
                    <h3 className="text-sm font-bold">Crew Registry Normalization</h3>
                  </div>
                  <CrewLeaderMerger />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 size={16} className="text-zinc-600" />
                    <h3 className="text-sm font-bold">Community Source Merger</h3>
                  </div>
                  <CompanyMerger />
                </div>
              </div>

                <div className="border-t border-zinc-200 pt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={16} className="text-zinc-600" />
                    <h3 className="text-sm font-bold">Bulk Normalization Grid</h3>
                  </div>
                  <GovernanceGrid />
                </div>
            </div>
          </div>
        )}

        {/* Security & Audit Trailing (Administrative Only) */}
        {isPowerUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Clock size={20} className="text-zinc-600" />
              <h2 className="text-xl font-bold tracking-tight">Security & System Lifecycle</h2>
            </div>
            <div className="card shadow-sm" style={{ padding: 24 }}>
              <div className="mb-6">
                <h3 className="text-lg font-black text-zinc-900 italic">Audit Log Trail</h3>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Full transparency on data entry, modifications, and exports</p>
              </div>
              <AuditLogViewer />
            </div>
          </div>
        )}

        {!isPowerUser && !permissions.can_edit_pricing && (
           <div className="card p-12 text-center" style={{ background: 'var(--surface-sunken)', border: '2px dashed var(--border)' }}>
            <Lock size={40} className="mx-auto text-zinc-300 mb-4" />
            <h2 className="text-xl font-bold">Settings Restricted</h2>
            <p className="text-zinc-500 mt-2 max-w-md mx-auto">
              Your current role ({profile?.role?.name || 'Standard'}) does not have permission to modify system parameters. 
              Please contact an administrator if you need to adjust labor rates or material pricing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
