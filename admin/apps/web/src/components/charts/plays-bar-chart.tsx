'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GamesPlayDay } from '@/lib/queries';

const PEAK = '#7B5DBA';
const DEFAULT = '#B5A0DA';

export function PlaysBarChart({ data }: { data: GamesPlayDay[] }) {
  const peak = data.reduce((max, d) => (d.plays > max ? d.plays : max), 0);
  const formatted = data.map((d) => ({
    iso: d.date,
    day: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric' }),
    plays: d.plays,
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#EFEADF" vertical={false} />
          <XAxis dataKey="day" stroke="#9C9384" fontSize={10} tickLine={false} axisLine={false} interval={7} />
          <YAxis stroke="#9C9384" fontSize={10} tickLine={false} axisLine={false} width={32} />
          <Tooltip
            cursor={{ fill: 'rgba(123,93,186,0.08)' }}
            contentStyle={{ background: '#1A1715', border: 'none', borderRadius: 8, fontSize: 11, padding: '6px 10px' }}
            itemStyle={{ color: '#FBF7EE' }}
            labelStyle={{ color: '#FBF7EE' }}
            formatter={(v: number) => [v, 'plays']}
            labelFormatter={(label, payload) => {
              const iso = payload?.[0]?.payload?.iso;
              if (!iso) return label;
              return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            }}
          />
          <Bar dataKey="plays" radius={[2, 2, 0, 0]}>
            {formatted.map((d) => (
              <Cell key={d.iso} fill={d.plays === peak && peak > 0 ? PEAK : DEFAULT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
