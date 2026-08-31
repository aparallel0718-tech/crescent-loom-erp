'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { inr } from '../lib/format';

export default function RevenueChart({ data }) {
  const formatted = (data || []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  return (
    <div className="card">
      <h2 className="font-semibold mb-3">Revenue Overview</h2>
      {formatted.length === 0 ? (
        <p className="text-sm text-glacier">No sales in this period yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#5B4FE9" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#5B4FE9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B7FF5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8B7FF5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E1" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8D89A8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8D89A8' }} />
            <Tooltip formatter={(v) => inr(v)} />
            <Area type="monotone" dataKey="revenue" stroke="#5B4FE9" strokeWidth={2} fill="url(#revenueFill)" name="Revenue" />
            <Area type="monotone" dataKey="sales" stroke="#8B7FF5" strokeWidth={2} fill="url(#salesFill)" name="Sales" />
            <Area type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} fill="url(#profitFill)" name="Profit" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}