import { createServerClient } from "@supabase/auth-helpers-nextjs";
import {
  TrendingUp,
  Building2,
  CalendarCheck,
  ArrowRight,
  Users,
  Package,
  HardHat,
  Plus,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { CrewLeaderDisplay } from "@/components/CrewLeaderDisplay";
import { ServiceDisplay } from "@/components/ServiceDisplay";
import { YieldPulseClient } from "@/components/YieldPulseClient";
import { ActivityTimelineClient } from "@/components/ActivityTimelineClient";
import { getCompanyMonthStartISO } from "@/lib/date-utils";

export default async function HomePage() {
  const cookieStore = await cookies();
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>System Configuration Pending</h2>
        <p>Please ensure Supabase environment variables are set in Vercel.</p>
      </div>
    );
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  // Fetch Stats (Reusable logic)
  async function getStats() {
    const [settingsRes, recentRes] = await Promise.all([
      supabase.from("app_settings").select("key, value"),
      supabase
        .from("service_history")
        .select("service_date, source_community_name, service_performed, crew_leader, crew_members, zone_name, is_special_service, is_one_time_service, service_category, communities!left(name, id)")
        .order("service_date", { ascending: false })
        .limit(8)
    ]);

    const settingsMap = Object.fromEntries((settingsRes.data || []).map((s: any) => [s.key, s.value]));
    const laborRate = parseFloat(settingsMap["labor_rate_per_hour"] || "32.50");

    const { data: stats } = await supabase.rpc("get_dashboard_stats", { p_labor_rate: laborRate });
    
    // Financial calculations (only if permitted)
    let highPerformers: any[] = [];
    let lowPerformers: any[] = [];
    let margin = 0;
    let mtdCost = 0;
    let mrr = 0;

    if (permissions.can_view_financials) {
      const monthStart = getCompanyMonthStartISO();
      const { data: communities } = await supabase.from('communities').select('id, name, total_monthly_price').eq('status', 'Active');
      const { data: mtdServices } = await supabase.from('service_history')
        .select(`
          community_id, total_labor_hours_num, crew_count, 
          service_product_usage(quantity_used, products(unit_price))
        `)
        .gte('service_date', monthStart);

      const communityStats = (communities || []).map(c => {
        // Fallback matching: Link by ID or by Exact Name to catch 'orphaned' logs
        const services = (mtdServices || []).filter(s => 
          s.community_id === c.id || 
          (s.source_community_name?.trim().toLowerCase() === c.name?.trim().toLowerCase())
        );
        const lCost = services.reduce((sum, s) => sum + (s.total_labor_hours_num || 0) * (s.crew_count || 1) * laborRate, 0);
        const mCost = services.reduce((sum, s) => {
          const prodUsage = (s.service_product_usage as any[]) || [];
          return sum + prodUsage.reduce((pSum, u) => pSum + (u.quantity_used || 0) * (u.products?.unit_price || 0), 0);
        }, 0);
        
        const tCost = lCost + mCost;
        const revenue = c.total_monthly_price || 0;
        const marginVal = revenue - tCost;
        const marginPct = revenue > 0 ? (marginVal / revenue) * 100 : 0;
        
        return {
          id: c.id,
          name: c.name,
          revenue,
          cost: tCost,
          margin: marginVal,
          marginPct: marginPct,
          visitCount: services.length
        };
      });

      // Only rank communities that have had at least one visit logged MTD
      const activeStats = communityStats.filter(c => c.visitCount > 0);

      highPerformers = activeStats.filter(c => c.marginPct >= 60 && c.revenue > 0).sort((a,b) => b.marginPct - a.marginPct).slice(0, 3);
      lowPerformers = activeStats.filter(c => c.marginPct < 40 && c.cost > 0).sort((a,b) => a.marginPct - b.marginPct).slice(0, 3);
      
      mrr = stats?.current_mrr || 0;
      mtdCost = (stats?.mtd_labor_cost || 0) + (stats?.mtd_material_cost || 0);
      margin = mrr - mtdCost;
    }

    return {
      mrr,
      communityCount: stats?.community_count || 0,
      recentActivity: recentRes.data || [],
      mtdLaborCost: stats?.mtd_labor_cost || 0,
      mtdMaterialCost: stats?.mtd_material_cost || 0,
      mtdCost,
      laborRate,
      mtdServiceCount: stats?.mtd_service_count || 0,
      highPerformers,
      lowPerformers,
      margin
    };
  }

  const { mrr, communityCount, recentActivity, mtdLaborCost, mtdMaterialCost, mtdCost, mtdServiceCount, highPerformers, lowPerformers, margin } = await getStats();

  const fmtMetric = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  return (
    <div style={{ padding: "48px 64px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header Section */}
      <div className="fade-up" style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.04em", margin: 0, color: "var(--text)" }}>
            Overview
          </h1>
          <p style={{ color: "var(--text-subtle)", fontSize: 16, marginTop: 8, fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — Portfolio summary for {profile?.full_name?.split(' ')[0]}.
          </p>
        </div>
        <div />
      </div>

      {/* Workflows Launchpad (High Priority) */}
      <div className="fade-up fade-up-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 48 }}>
        {permissions.can_log_service && <QuickAction href="/log" icon={<Plus size={18} />} title="Record Service" desc="Primary daily entry" accent />}
        {permissions.can_view_dashboard && <QuickAction href="/inventory" icon={<Package size={18} />} title="Materials & Labor" desc="Tracking & efficiency" />}
        {permissions.can_view_dashboard && <QuickAction href="/reports" icon={<ClipboardList size={18} />} title="Reports" desc="Export & filter results" />}
        {permissions.can_view_dashboard && <QuickAction href="/communities" icon={<Building2 size={18} />} title="Community Portfolio" desc="Communities & zones" />}
      </div>

      {/* Primary Content Grid */}
      <div className="fade-up fade-up-2" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40 }}>
        
        {/* Left: Operations Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div className="card shadow-sm" style={{ border: 'none', background: 'transparent' }}>
             <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <CalendarCheck size={18} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em' }}>Field Activity Timeline</h2>
                <Link href="/reports" style={{ marginLeft: 'auto', fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Full Archive</Link>
              </div>
              
              <ActivityTimelineClient activities={recentActivity} />
          </div>
        </div>

        {/* Right: Status & Pulse */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* MTD Quick Stats */}
          {permissions.can_view_financials && (
            <div className="card" style={{ padding: 28, background: 'var(--text)', color: 'white', borderRadius: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 20 }}>Month-to-Date</div>
              <div style={{ spaceY: 6 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Net Profit Prediction</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#10b981' }}>{margin < 0 ? "-" : ""}{fmtMetric(Math.abs(margin))}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                   <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Material</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{fmtMetric(mtdMaterialCost)}</div>
                   </div>
                   <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Visits</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{mtdServiceCount}</div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {permissions.can_view_financials && (
            <div className="card" style={{ padding: 28, background: 'white', borderRadius: 32, border: '1px solid var(--border)' }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--accent)' }} />
                <h2 style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yield Pulse</h2>
              </div>
              <YieldPulseClient
                highPerformers={highPerformers}
                lowPerformers={lowPerformers}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CostPill({ label, value, pct, color }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      {pct !== undefined && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{pct.toFixed(0)}% of MRR</div>
      )}
    </div>
  );
}

function KPICard({ icon, label, value, sub, color }: any) {
  const colors: any = {
    blue: { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
    amber: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: c.text, marginBottom: 14 }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function QuickAction({ href, icon, title, desc, accent = false }: any) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: accent ? "var(--accent-dim)" : "var(--surface)",
        border: `1px solid ${accent ? "var(--accent-border)" : "var(--border)"}`,
        borderRadius: 12,
        textDecoration: "none",
        transition: "all 0.15s",
      }}
      className="card"
    >
      <div style={{ color: accent ? "var(--accent)" : "var(--text-muted)" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 2 }}>{desc}</div>
      </div>
      <ArrowRight size={13} style={{ marginLeft: "auto", color: "var(--text-subtle)" }} />
    </Link>
  );
}
