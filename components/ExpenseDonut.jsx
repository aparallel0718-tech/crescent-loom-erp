'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { inr } from '../lib/format';

const COLORS = ['#5B4FE9', '#8B7FF5', '#10B981', '#F59E0B', '#EC4899'];

export default function ExpenseDonut({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const nonZero = data.filter((d) => d.value > 0);

  return (
    <div className="card">
      <h2 className="font-semibold mb-3">Expense Breakdown</h2>
      {nonZero.length === 0 ? (
        <p className="text-sm text-glacier">No expenses in this period yet.</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative w-[140px] h-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={nonZero} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={2}>
                  {nonZero.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-sm font-semibold text-midnight">{inr(total)}</p>
              <p className="text-[10px] text-glacier">Total</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {nonZero.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-midnight">{entry.name}</span>
                <span className="text-glacier text-xs">{inr(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}