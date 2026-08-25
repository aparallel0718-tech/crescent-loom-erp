'use client';

import { useEffect, useState } from 'react';
import StatCard from '../../../components/StatCard';
import { inr, pct } from '../../../lib/format';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState('month'); // month | quarter | year

  useEffect(() => {
    const now = new Date();
    let from;
    if (range === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === 'quarter') from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    if (range === 'year') from = new Date(now.getFullYear(), 0, 1);
    fetch(`/api/dashboard?from=${from.toISOString()}&to=${now.toISOString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [range]);

  if (!data) return <p className="text-sm text-glacier">Loading dashboard…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Business Dashboard</h1>
        <div className="flex gap-2">
          {['month', 'quarter', 'year'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                range === r ? 'bg-midnight text-chalk border-midnight' : 'border-gray-300 text-glacier'
              }`}
            >
              This {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Revenue" value={inr(data.totalRevenue)} />
        <StatCard label="Net Sales" value={inr(data.netSales)} sub={`${data.orderCount} orders`} />
        <StatCard label="Gross Profit" value={inr(data.grossProfit)} tone={data.grossProfit >= 0 ? 'good' : 'bad'} />
        <StatCard label="Net Profit" value={inr(data.netProfit)} tone={data.netProfit >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Gross Margin" value={pct(data.grossMarginPct)} />
        <StatCard label="Net Margin" value={pct(data.netMarginPct)} />
        <StatCard label="Total Expenses" value={inr(data.totalExpense)} />
        <StatCard label="Avg Order Value" value={inr(data.avgOrderValue)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Marketing Spend" value={inr(data.marketingExpense)} sub={`${pct(data.marketingPctOfRevenue)} of revenue`} />
        <StatCard label="Operating Expense" value={inr(data.operatingExpense)} />
        <StatCard label="Shipping Cost" value={inr(data.shippingCost)} />
        <StatCard label="COGS" value={inr(data.cogs)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Best Sellers</h2>
          {data.bestSellers.length === 0 ? (
            <p className="text-sm text-glacier">No sales in this period yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr><th>Product</th><th>Units</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {data.bestSellers.map((p) => (
                  <tr key={p.name}><td>{p.name}</td><td>{p.units}</td><td>{inr(p.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Worst Sellers</h2>
          {data.worstSellers.length === 0 ? (
            <p className="text-sm text-glacier">No sales in this period yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr><th>Product</th><th>Units</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {data.worstSellers.map((p) => (
                  <tr key={p.name}><td>{p.name}</td><td>{p.units}</td><td>{inr(p.revenue)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(data.lowStock.length > 0 || data.outOfStock.length > 0) && (
        <div className="card border-gold/40">
          <h2 className="font-semibold mb-3">Stock Alerts</h2>
          {data.outOfStock.length > 0 && (
            <p className="text-sm text-red-600 mb-2">{data.outOfStock.length} product(s) out of stock: {data.outOfStock.map((p) => p.name).join(', ')}</p>
          )}
          {data.lowStock.length > 0 && (
            <p className="text-sm text-gold">{data.lowStock.length} product(s) at/below reorder level: {data.lowStock.map((p) => p.name).join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
