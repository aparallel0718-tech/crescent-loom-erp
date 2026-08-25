'use client';

import { useEffect, useState } from 'react';
import { inr, pct } from '../../../lib/format';

function Row({ label, value, bold, indent }) {
  return (
    <div className={`flex justify-between py-2 ${bold ? 'font-semibold border-t border-gray-200 mt-1' : ''} ${indent ? 'pl-4 text-sm text-glacier' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function PnLPage() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState('month');

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

  if (!data) return <p className="text-sm text-glacier">Loading…</p>;

  const operatingProfit = data.grossProfit - data.marketingExpense - data.operatingExpense - data.shippingCost;
  const operatingMarginPct = data.netSales > 0 ? (operatingProfit / data.netSales) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Profit &amp; Loss</h1>
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

      <div className="card max-w-2xl">
        <Row label="Gross Revenue" value={inr(data.totalRevenue)} />
        <Row label="Discounts" value={`- ${inr(data.totalDiscount)}`} indent />
        <Row label="Net Sales" value={inr(data.netSales)} bold />

        <Row label="Cost of Goods Sold" value={`- ${inr(data.cogs)}`} indent />
        <Row label="Gross Profit" value={inr(data.grossProfit)} bold />
        <Row label={`Gross Margin`} value={pct(data.grossMarginPct)} indent />

        <Row label="Marketing Expense" value={`- ${inr(data.marketingExpense)}`} indent />
        <Row label="Operating Expense" value={`- ${inr(data.operatingExpense)}`} indent />
        <Row label="Shipping Cost" value={`- ${inr(data.shippingCost)}`} indent />
        <Row label="Operating Profit" value={inr(operatingProfit)} bold />
        <Row label="Operating Margin" value={pct(operatingMarginPct)} indent />

        <Row label="Net Profit" value={inr(data.netProfit)} bold />
        <Row label="Net Margin" value={pct(data.netMarginPct)} indent />
      </div>
    </div>
  );
}
