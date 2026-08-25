'use client';

import { useEffect, useState } from 'react';
import { inr } from '../../../lib/format';

export default function AnalyticsPage() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/sales').then((r) => r.json()).then(setSales);
    fetch('/api/products').then((r) => r.json()).then(setProducts);
  }, []);

  const byProduct = {};
  for (const s of sales) {
    const key = s.productName || 'Unknown';
    if (!byProduct[key]) byProduct[key] = { name: key, units: 0, revenue: 0, orders: 0 };
    byProduct[key].units += s.qty;
    byProduct[key].revenue += s.qty * s.sellingPrice - (s.discount || 0);
    byProduct[key].orders += 1;
  }
  const ranked = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);

  const byCategory = {};
  for (const s of sales) {
    const product = products.find((p) => p.name === s.productName);
    const cat = product?.category || 'Uncategorised';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, revenue: 0, units: 0 };
    byCategory[cat].revenue += s.qty * s.sellingPrice - (s.discount || 0);
    byCategory[cat].units += s.qty;
  }
  const categoryRanked = Object.values(byCategory).sort((a, b) => b.revenue - a.revenue);

  const paymentSplit = {};
  for (const s of sales) {
    paymentSplit[s.paymentMode] = (paymentSplit[s.paymentMode] || 0) + 1;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Product Performance (by revenue)</h2>
          {ranked.length === 0 ? (
            <p className="text-sm text-glacier">No sales data yet.</p>
          ) : (
            <table className="w-full">
              <thead><tr><th>Product</th><th>Units</th><th>Orders</th><th>Revenue</th></tr></thead>
              <tbody>
                {ranked.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td><td>{p.units}</td><td>{p.orders}</td><td>{inr(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-3">Category Performance</h2>
          {categoryRanked.length === 0 ? (
            <p className="text-sm text-glacier">No sales data yet.</p>
          ) : (
            <table className="w-full">
              <thead><tr><th>Category</th><th>Units</th><th>Revenue</th></tr></thead>
              <tbody>
                {categoryRanked.map((c) => (
                  <tr key={c.category}>
                    <td>{c.category}</td><td>{c.units}</td><td>{inr(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card max-w-md">
        <h2 className="font-semibold mb-3">Orders by Payment Mode</h2>
        {Object.keys(paymentSplit).length === 0 ? (
          <p className="text-sm text-glacier">No sales data yet.</p>
        ) : (
          <table className="w-full">
            <tbody>
              {Object.entries(paymentSplit).map(([mode, count]) => (
                <tr key={mode}><td>{mode}</td><td>{count} orders</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
