'use client';
import { inr } from '../lib/format';

export default function TopSellingProducts({ products }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Top Selling Products</h2>
      </div>
      {(!products || products.length === 0) ? (
        <p className="text-sm text-glacier">No sales in this period yet.</p>
      ) : (
        <div className="space-y-3">
          {products.slice(0, 5).map((p, i) => (
            <div key={p.name} className="flex items-center gap-3">
              <span className="text-xs text-glacier w-5">{String(i + 1).padStart(2, '0')}</span>
              <div className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center text-xs font-semibold text-midnight shrink-0">
                {p.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-midnight truncate">{p.name}</p>
                <p className="text-xs text-glacier">{p.units} units</p>
              </div>
              <p className="text-sm font-semibold text-midnight">{inr(p.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}