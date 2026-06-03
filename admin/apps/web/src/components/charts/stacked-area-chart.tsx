'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RevenueDay } from '@/lib/queries';

const colors = {
  food: '#B8543D',
  drinks: '#B8843D',
  games: '#7B5DBA',
};

export function StackedAreaChart({ data }: { data: RevenueDay[] }) {
  const formatted = data.map((d, i) => ({
    day: `Day ${i + 1}`,
    iso: d.date,
    Food: d.food / 100,
    Drinks: d.drinks / 100,
    Games: d.games / 100,
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#EFEADF" vertical={false} />
          <XAxis dataKey="day" stroke="#9C9384" fontSize={10} tickLine={false} axisLine={false} interval={6} />
          <YAxis
            stroke="#9C9384"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `£${Math.round(v)}`}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: '#1A1715', strokeWidth: 0.5, strokeDasharray: '2 2' }}
            contentStyle={{
              background: '#1A1715',
              border: 'none',
              borderRadius: 8,
              fontSize: 11,
              color: '#FBF7EE',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#FBF7EE', fontWeight: 500, marginBottom: 4 }}
            itemStyle={{ color: '#FBF7EE' }}
            formatter={(v: number, name: string) => [`£${v.toFixed(0)}`, name]}
            labelFormatter={(label, payload) => {
              const iso = payload?.[0]?.payload?.iso;
              if (!iso) return label;
              return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
            }}
          />
          <Area type="monotone" dataKey="Food" stackId="rev" stroke={colors.food} fill={colors.food} fillOpacity={0.85} />
          <Area type="monotone" dataKey="Drinks" stackId="rev" stroke={colors.drinks} fill={colors.drinks} fillOpacity={0.85} />
          <Area type="monotone" dataKey="Games" stackId="rev" stroke={colors.games} fill={colors.games} fillOpacity={0.85} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
