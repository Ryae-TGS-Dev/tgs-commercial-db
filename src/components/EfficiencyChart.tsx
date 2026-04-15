'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Cell
} from 'recharts';

const dummyData = [
  { name: 'Avalon Park', efficiency: 98, margin: 2400 },
  { name: 'Lely Resort', efficiency: 105, margin: 4200 },
  { name: 'Greyhawk', efficiency: 82, margin: 1800 },
  { name: 'Falling Waters', efficiency: 112, margin: 3100 },
  { name: 'Valencia Sky', efficiency: 95, margin: 5600 },
];

export default function EfficiencyChart() {
  return (
    <div className="h-[300px] w-full bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-6">
         <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Application Precision (Actual vs Expected)</div>
         <div className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">Target: 100%</div>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={dummyData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#A1A1AA' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#A1A1AA' }}
            unit="%"
          />
          <Tooltip 
            cursor={{ fill: '#f8f8f8' }}
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
          />
          <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="5 5" label={{ position: 'right', value: 'Target', fill: '#16a34a', fontSize: 10, fontWeight: 900 }} />
          <Bar dataKey="efficiency" radius={[6, 6, 0, 0]} barSize={32}>
            {dummyData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.efficiency >= 90 && entry.efficiency <= 110 ? '#16a34a' : entry.efficiency < 90 ? '#fb7185' : '#f59e0b'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
