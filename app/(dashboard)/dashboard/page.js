'use client';

import { useEffect, useState } from 'react';
import StatCard from '../../../components/StatCard';import RevenueChart from '../../../components/RevenueChart';
import ExpenseDonut from '../../../components/ExpenseDonut';
import TopSellingProducts from '../../../components/TopSellingProducts';
import RecentOrders from '../../../components/RecentOrders';
import { useSession } from 'next-auth/react';
import { inr, pct } from '../../../lib/format';const Icon = {
  revenue: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v20M17 6.5c0-2-2-3.5-5-3.5s-5 1.5-5 3.5 2 3 5 3 5 1 5 3.5-2 3.5-5 3.5-5-1.5-5-3.5" /></svg>
  ),
  sales: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h2l2.4 12h11.2L21 9H7" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17.5" cy="20" r="1.3" /></svg>
  ),
  profit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></svg>
  ),
  wallet: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12.5h2" /><path d="M3 9h18" /></svg>
  ),
  percent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="2.3" /><circle cx="17" cy="17" r="2.3" /><path d="M18 6 6 18" /></svg>
  ),
  expense: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M7 9h10M7 13h6" /></svg>
  ),
  order: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 8 9-5 9 5-9 5-9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></svg>
  ),
  marketing: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10v4h4l6 4V6L7 10H3Z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>
  ),
  shipping: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="12" height="9" rx="1.2" /><path d="M14 10h4l3 3v3h-7" /><circle cx="6.5" cy="18.5" r="1.4" /><circle cx="17.5" cy="18.5" r="1.4" /></svg>
  ),
  cogs: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
  ),
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState(null);
  const [range, setRange] = useState('month'); // month | quarter | year
  const firstName = (session?.user?.name || '').split(' ')[0];
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
    <div className="page-enter">
            <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-midnight">
            {firstName ? `Good morning, ${firstName}! \u{1F44B}` : 'Business Dashboard'}
          </h1>
          <p className="text-sm text-glacier mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex gap-2 bg-white border border-purple-100 rounded-full p-1">
          {['month', 'quarter', 'year'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                range === r
                  ? 'bg-gradient-to-r from-midnight to-gold text-white'
                  : 'text-glacier hover:text-midnight'
              }`}
            >
              This {r}
            </button>
          ))}
        </div>
      </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Revenue" value={inr(data.totalRevenue)} icon={Icon.revenue} color="purple" />
        <StatCard label="Net Sales" value={inr(data.netSales)} sub={`${data.orderCount} orders`} icon={Icon.sales} color="blue" />
        <StatCard label="Gross Profit" value={inr(data.grossProfit)} tone={data.grossProfit >= 0 ? 'good' : 'bad'} icon={Icon.profit} color="green" />
        <StatCard label="Net Profit" value={inr(data.netProfit)} tone={data.netProfit >= 0 ? 'good' : 'bad'} icon={Icon.wallet} color="pink" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Gross Margin" value={pct(data.grossMarginPct)} icon={Icon.percent} color="purple" />
        <StatCard label="Net Margin" value={pct(data.netMarginPct)} icon={Icon.percent} color="blue" />
        <StatCard label="Total Expenses" value={inr(data.totalExpense)} icon={Icon.expense} color="orange" />
        <StatCard label="Avg Order Value" value={inr(data.avgOrderValue)} icon={Icon.order} color="green" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Marketing Spend" value={inr(data.marketingExpense)} sub={`${pct(data.marketingPctOfRevenue)} of revenue`} icon={Icon.marketing} color="purple" />
        <StatCard label="Operating Expense" value={inr(data.operatingExpense)} icon={Icon.expense} color="blue" />
        <StatCard label="Shipping Cost" value={inr(data.shippingCost)} icon={Icon.shipping} color="orange" />
        <StatCard label="COGS" value={inr(data.cogs)} icon={Icon.cogs} color="pink" />
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart data={data.dailySeries} />
        <ExpenseDonut
          data={[
            { name: 'Marketing', value: data.marketingExpense },
            { name: 'Operating', value: data.operatingExpense },
            { name: 'Shipping', value: data.shippingCost },
            { name: 'COGS', value: data.cogs },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <RecentOrders orders={data.recentOrders} />
        </div>
        <TopSellingProducts products={data.bestSellers} />
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
