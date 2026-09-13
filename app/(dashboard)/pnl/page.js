'use client';
import { useEffect, useMemo, useState } from 'react';
import { inr, pct } from '../../../lib/format';

const RANGES = [
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
];

function rangeBounds(range) {
  const now = new Date();
  let from;
  if (range === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === 'quarter') from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  if (range === 'year') from = new Date(now.getFullYear(), 0, 1);
  return { from, to: now };
}

function prevRangeBounds(from, to) {
  const duration = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - duration), to: new Date(from.getTime()) };
}

function shortDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function buildBuckets(from, to, range) {
  const buckets = [];
  if (range === 'year') {
    const year = from.getFullYear();
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 1);
      if (start > to) break;
      buckets.push({ start, end: end > to ? to : end, label: start.toLocaleDateString('en-GB', { month: 'short' }) });
    }
  } else if (range === 'quarter') {
    let cursor = new Date(from);
    while (cursor < to) {
      const start = new Date(cursor);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      buckets.push({ start, end: end > to ? to : end, label: start.toLocaleDateString('en-GB', { month: 'short' }) });
      cursor = end;
    }
  } else {
    let cursor = new Date(from);
    while (cursor < to) {
      const start = new Date(cursor);
      const end = new Date(cursor);
      end.setDate(end.getDate() + 7);
      buckets.push({ start, end: end > to ? to : end, label: shortDate(start) });
      cursor = end;
    }
    if (buckets.length && buckets[buckets.length - 1].end.getTime() < to.getTime()) {
      buckets.push({ start: buckets[buckets.length - 1].end, end: to, label: shortDate(to) });
    }
  }
  return buckets;
}

function StatCard({ icon, label, value, deltaLabel, delta, sub }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
            {icon}
          </div>
          <p className="text-xs text-glacier">{label}</p>
        </div>
        <span className="text-glacier">{'\u22EF'}</span>
      </div>
      <p className="text-2xl font-semibold text-[#F2F1EE] mt-3">{value}</p>
      {delta ? (
        <p className={`text-xs mt-1 flex items-center gap-1 ${delta.dir === 'up' ? 'text-emerald-400' : delta.dir === 'down' ? 'text-red-400' : 'text-glacier'}`}>
          {delta.dir === 'up' ? '\u2191' : delta.dir === 'down' ? '\u2193' : '\u2014'} {delta.pct != null ? `${delta.pct}%` : ''} {deltaLabel}
        </p>
      ) : (
        <p className="text-xs text-glacier mt-1">{sub}</p>
      )}
    </div>
  );
}

function Row({ label, value, bold, indent }) {
  return (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${bold ? 'font-semibold bg-white/5' : ''} ${indent ? 'pl-6 text-sm text-glacier' : 'text-[#F2F1EE]'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const SERIES = [
  { key: 'revenue', label: 'Revenue', color: '#E8B563' },
  { key: 'operatingExpense', label: 'Operating Expenses', color: '#9CA3AF' },
  { key: 'marketingExpense', label: 'Marketing Expenses', color: '#C9973F' },
  { key: 'shippingCost', label: 'Shipping Cost', color: '#F2CD85' },
];

function TrendChart({ buckets, series }) {
  const width = 640;
  const height = 200;
  const padL = 36;
  const padB = 24;
  const padT = 10;
  const allValues = SERIES.flatMap((s) => series[s.key] || []);
  const max = Math.max(1, ...allValues);
  const niceMax = Math.ceil(max / 1) || 1;
  const stepX = (width - padL - 10) / Math.max(1, buckets.length - 1);

  function pathFor(values) {
    const points = values.map((v, i) => {
      const x = padL + i * stepX;
      const y = padT + (1 - v / niceMax) * (height - padT - padB);
      return [x, y];
    });
    return { d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' '), points };
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
        {[0, 0.5, 1].map((f) => (
          <text key={f} x={0} y={padT + f * (height - padT - padB) + 4} fontSize="10" fill="#8a8578">
            {'\u20B9'}{(niceMax * (1 - f)).toFixed(niceMax < 10 ? 1 : 0)}
          </text>
        ))}
        {SERIES.map((s) => {
          const { d, points } = pathFor(series[s.key] || []);
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill={s.color} />
              ))}
            </g>
          );
        })}
        {buckets.map((b, i) => (
          <text key={i} x={padL + i * stepX} y={height - 6} fontSize="10" fill="#8a8578" textAnchor="middle">
            {b.label}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-4 mt-2">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-glacier">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Donut({ segments, total }) {
  const size = 140;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const fraction = total ? seg.value / total : 0;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-lg font-semibold text-[#F2F1EE]">{'\u20B9'}{Math.round(total)}</p>
        <p className="text-[10px] text-glacier">Total Expenses</p>
      </div>
    </div>
  );
}

export default function PnLPage() {
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [range, setRange] = useState('month');
  const [seriesData, setSeriesData] = useState(null);
  const [chartRange, setChartRange] = useState('month');

  const { from, to } = useMemo(() => rangeBounds(range), [range]);

  useEffect(() => {
    fetch(`/api/dashboard?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then(setData);
    const { from: pf, to: pt } = prevRangeBounds(from, to);
    fetch(`/api/dashboard?from=${pf.toISOString()}&to=${pt.toISOString()}`)
      .then((r) => r.json())
      .then(setPrevData)
      .catch(() => setPrevData(null));
  }, [from, to]);

  useEffect(() => {
    const { from: cf, to: ct } = rangeBounds(chartRange);
    const buckets = buildBuckets(cf, ct, chartRange);
    Promise.all(
      buckets.map((b) =>
        fetch(`/api/dashboard?from=${b.start.toISOString()}&to=${b.end.toISOString()}`).then((r) => r.json())
      )
    ).then((results) => {
      setSeriesData({
        buckets,
        series: {
          revenue: results.map((r) => r.totalRevenue || 0),
          operatingExpense: results.map((r) => r.operatingExpense || 0),
          marketingExpense: results.map((r) => r.marketingExpense || 0),
          shippingCost: results.map((r) => r.shippingCost || 0),
        },
      });
    });
  }, [chartRange]);

  if (!data) return <p className="text-sm text-glacier">{'Loading\u2026'}</p>;

  const operatingProfit = data.grossProfit - data.marketingExpense - data.operatingExpense - data.shippingCost;
  const operatingMarginPct = data.netSales > 0 ? (operatingProfit / data.netSales) * 100 : 0;

  function delta(curKey, curVal) {
    if (!prevData) return null;
    const prevVal = prevData[curKey];
    if (!prevVal) return { dir: 'flat', pct: null };
    const change = ((curVal - prevVal) / prevVal) * 100;
    return { dir: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', pct: Math.abs(Math.round(change)) };
  }

  const totalExpensesForDonut = (data.marketingExpense || 0) + (data.operatingExpense || 0) + (data.shippingCost || 0);
  const donutSegments = [
    { label: 'Marketing Expense', value: data.marketingExpense || 0, color: '#E8B563' },
    { label: 'Operating Expense', value: data.operatingExpense || 0, color: '#9CA3AF' },
    { label: 'Shipping Cost', value: data.shippingCost || 0, color: '#C9973F' },
    { label: 'Others', value: 0, color: '#F2CD85' },
  ];

  return (
    <div>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs text-glacier mb-1">Finance /</p>
          <h1 className="text-3xl font-semibold">
            <span className="text-[#F2F1EE]">Profit &amp; </span>
            <span className="text-[#E8B563]">Loss</span>
          </h1>
          <p className="text-sm text-glacier mt-1">Your business performance, simplified.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-full border border-white/10 text-[#F2F1EE] whitespace-nowrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            {shortDate(from)} {'\u2013'} {shortDate(to)}
          </span>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => { setRange(r.value); setChartRange(r.value); }}
              className={`text-xs px-4 py-2.5 rounded-full border whitespace-nowrap ${
                range === r.value ? 'bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black border-transparent font-semibold' : 'border-white/10 text-[#F2F1EE]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>}
          label="Gross Revenue"
          value={inr(data.totalRevenue)}
          delta={delta('totalRevenue', data.totalRevenue)}
          deltaLabel={`vs last ${range}`}
        />
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></svg>}
          label="Net Sales"
          value={inr(data.netSales)}
          delta={delta('netSales', data.netSales)}
          deltaLabel={`vs last ${range}`}
        />
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9 10.5a3 3 0 0 1 3-1.5c1.7 0 3 1 3 2.5S13.7 14 12 14s-3 1-3 2.5 1.3 2.5 3 2.5a3 3 0 0 0 3-1.5" /></svg>}
          label="Gross Profit"
          value={inr(data.grossProfit)}
          sub={`${pct(data.grossMarginPct)} margin`}
        />
        <StatCard
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.2 15a9 9 0 1 1-3.8-9.9" /><path d="M12 3v9l7 3" /></svg>}
          label="Net Profit"
          value={inr(data.netProfit)}
          sub={`${pct(data.netMarginPct)} margin`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F2F1EE]">Profit &amp; Loss Statement</p>
              <p className="text-xs text-glacier">Key financials for the selected period.</p>
            </div>
          </div>
          <div className="flex justify-between text-[11px] uppercase tracking-wide text-glacier px-3 pt-3 pb-1">
            <span>Particulars</span>
            <span>Amount ({'\u20B9'})</span>
          </div>
          <Row label="Gross Revenue" value={inr(data.totalRevenue)} bold />
          <Row label="Discounts" value={`- ${inr(data.totalDiscount)}`} indent />
          <Row label="Net Sales" value={inr(data.netSales)} bold />
          <Row label="Cost of Goods Sold" value={`- ${inr(data.cogs)}`} indent />
          <Row label="Gross Profit" value={inr(data.grossProfit)} bold />
          <Row label="Gross Margin" value={pct(data.grossMarginPct)} indent />
          <Row label="Marketing Expense" value={`- ${inr(data.marketingExpense)}`} indent />
          <Row label="Operating Expense" value={`- ${inr(data.operatingExpense)}`} indent />
          <Row label="Shipping Cost" value={`- ${inr(data.shippingCost)}`} indent />
          <Row label="Operating Profit" value={inr(operatingProfit)} bold />
          <Row label="Operating Margin" value={pct(operatingMarginPct)} indent />
          <Row label="Net Profit" value={inr(data.netProfit)} bold />
          <Row label="Net Margin" value={pct(data.netMarginPct)} indent />
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F2F1EE]">Revenue vs Expenses</p>
                <p className="text-xs text-glacier">Track income and major expenses over time.</p>
              </div>
            </div>
            <select
              className="text-xs bg-black/30 border border-white/10 rounded-full px-3 py-1.5 text-[#F2F1EE] outline-none"
              value={chartRange}
              onChange={(e) => setChartRange(e.target.value)}
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {seriesData ? <TrendChart buckets={seriesData.buckets} series={seriesData.series} /> : <p className="text-xs text-glacier py-8 text-center">{'Loading\u2026'}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.2 15a9 9 0 1 1-3.8-9.9" /><path d="M12 3v9l7 3" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F2F1EE]">Expense Breakdown</p>
              <p className="text-xs text-glacier">See where your money goes.</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Donut segments={donutSegments} total={totalExpensesForDonut} />
            <div className="space-y-2 flex-1">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-glacier">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                    {seg.label}
                  </span>
                  <span className="text-[#F2F1EE]">{totalExpensesForDonut ? Math.round((seg.value / totalExpensesForDonut) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
                <span className="text-sm font-semibold">%</span>
              </div>
              <p className="text-sm font-semibold text-[#F2F1EE]">Key Margins</p>
            </div>
            <span className="text-glacier">{'\u203A'}</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-glacier">Gross Margin</span>
              <span className="text-lg font-semibold text-[#F2F1EE]">{pct(data.grossMarginPct)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-glacier">Operating Margin</span>
              <span className="text-lg font-semibold text-[#F2F1EE]">{pct(operatingMarginPct)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-glacier">Net Margin</span>
              <span className="text-lg font-semibold text-[#F2F1EE]">{pct(data.netMarginPct)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#E8B563] mt-0.5 shrink-0"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" /></svg>
          <div>
            <p className="text-sm font-semibold text-[#F2F1EE]">Insights</p>
            <p className="text-sm text-glacier">Marketing spend as % of revenue is shown on the main dashboard.</p>
          </div>
        </div>
        <button
          type="button"
          className="text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap flex items-center gap-2"
        >
          View Detailed Report
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
