'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
          <LineChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE8E1" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8D89A8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8D89A8' }} />
            <Tooltip formatter={(v) => inr(v)} />
            <Line type="monotone" dataKey="revenue" stroke="#5B4FE9" strokeWidth={2} dot={false} name="Revenue" />
            <Line type="monotone" dataKey="sales" stroke="#8B7FF5" strokeWidth={2} dot={false} name="Sales" />
            <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}