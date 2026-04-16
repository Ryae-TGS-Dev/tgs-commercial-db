'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from 'recharts';
import { CommunityDrawer } from './CommunityDrawer';

interface TrendPoint {
  date: string;
  revenue: number;
  laborCost: number;
  materialCost: number;
}

interface CommunityPoint {
  id?: string;
  name: string;
  marginPct: number;
}

interface AllocationPoint {
  name: string;
  value: number;
  color: string;
}

const fmtCurrency = (val: number) => 
  `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const totalCost = payload.reduce((sum: number, entry: any) => 
      entry.dataKey !== 'revenue' ? sum + entry.value : sum, 0);
    
    return (
      <div style={{ 
        background: 'rgba(9, 9, 11, 0.98)', 
        padding: '16px', 
        borderRadius: '16px', 
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)'
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}
        </p>
        <div style={{ spaceY: 6 }}>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{entry.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>{fmtCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
           <span style={{ fontSize: 11, fontWeight: 900, color: (payload[0].value - totalCost) > 0 ? '#10b981' : '#f43f5e', textTransform: 'uppercase' }}>Profit Edge</span>
           <span style={{ fontSize: 13, fontWeight: 900, color: (payload[0].value - totalCost) > 0 ? '#10b981' : '#f43f5e' }}>{fmtCurrency(payload[0].value - totalCost)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function DashboardCharts({
  trendData,
  communityData,
  allocationData,
  efficiencyTarget = 60
}: {
  trendData: TrendPoint[];
  communityData: CommunityPoint[];
  allocationData: AllocationPoint[];
  efficiencyTarget?: number;
}) {
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  // UX-4: Dynamic height based on community count
  const leaderboardHeight = useMemo(() => Math.max(210, communityData.slice(0, 8).length * 35), [communityData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Top Row: Main Trend + Allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Smooth Stacked Trend */}
        <div className="card" style={{ padding: '32px', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Financial Velocity</h3>
              <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>Cumulative revenue vs operational burn</p>
            </div>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                   <linearGradient id="zinc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18181b" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="#18181b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--text-subtle)' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--text-subtle)' }}
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Projected Revenue"
                  stroke="#18181b" 
                  strokeWidth={4}
                  fill="url(#zinc)"
                />
                <Area 
                  type="monotone" 
                  stackId="1"
                  dataKey="laborCost" 
                  name="Labor Overhead"
                  stroke="#a1a1aa" 
                  strokeWidth={2}
                  fill="#f4f4f5"
                />
                <Area 
                  type="monotone" 
                  stackId="1"
                  dataKey="materialCost" 
                  name="Material Burn"
                  stroke="#52525b" 
                  strokeWidth={2}
                  fill="#e4e4e7"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Allocation */}
        <div className="card" style={{ padding: '32px', background: 'white', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', margin: '0 0 24px' }}>Cost Split</h3>
          
          <div style={{ width: '100%', height: 230, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={75}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                   content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div style={{ background: 'var(--text)', padding: '8px 12px', borderRadius: 12, color: 'white', fontSize: 12, fontWeight: 800 }}>
                          {payload[0].name}: {fmtCurrency(payload[0].value)}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Total</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {fmtCurrency(allocationData.reduce((s, a) => s + a.value, 0))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
             {allocationData.map((item, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 900 }}>
                    {allocationData.reduce((s, a) => s + a.value, 0) > 0 
                      ? ((item.value / allocationData.reduce((s, a) => s + a.value, 0)) * 100).toFixed(0) 
                      : 0}%
                  </span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Performance Rankings (Horizontal Bars) */}
      <div className="card" style={{ padding: '32px', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Efficiency Leaderboard</h3>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>Tap any community to drill-down into specific service logs</p>
          </div>
        </div>

        <div style={{ width: '100%', height: leaderboardHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={communityData.slice(0, 8)} 
              layout="vertical" 
              margin={{ top: 0, right: 80, left: 40, bottom: 0 }}
              onClick={(state) => {
                if (state && state.activePayload) {
                  const id = state.activePayload[0].payload.id;
                  if (id) setSelectedCommunityId(id);
                }
              }}
            >
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={(props: any) => {
                  const { verticalAnchor, visibleTicksCount, index, tickFormatter, ...restProps } = props;
                  const community = communityData.find(c => c.name === props.payload.value);
                  return (
                    <text
                      {...restProps}
                      style={{ fontSize: 12, fontWeight: 800, fill: '#18181b', cursor: 'pointer' }}
                      onClick={() => {
                        if (community?.id) setSelectedCommunityId(community.id);
                      }}
                    >
                      {props.payload.value}
                    </text>
                  );
                }}
                width={160}
              />
              <Tooltip 
                cursor={{ fill: 'var(--surface-2)', radius: 8 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{ background: 'var(--text)', padding: '10px 16px', borderRadius: 12, color: 'white', fontSize: 13, fontWeight: 900, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                        {payload[0].value.toFixed(1)}% Yield Margin
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'uppercase' }}>Click to zoom</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="marginPct" 
                radius={[0, 8, 8, 0]} 
                barSize={28}
                onClick={(data) => {
                  if (data && data.id) setSelectedCommunityId(data.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                {communityData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.marginPct >= efficiencyTarget ? '#10b981' : entry.marginPct > 0 ? '#f59e0b' : '#f43f5e'} 
                  />
                ))}
                <LabelList 
                  dataKey="marginPct" 
                  position="right" 
                  formatter={(val: number) => `${val.toFixed(1)}%`} 
                  style={{ fontSize: 13, fontWeight: 900, fill: '#18181b' }}
                  offset={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <CommunityDrawer
        communityId={selectedCommunityId}
        onClose={() => setSelectedCommunityId(null)}
      />
    </div>
  );
}
