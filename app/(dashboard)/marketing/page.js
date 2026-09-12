'use client';
import { useEffect, useMemo, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

const CHANNELS = ['Meta Ads', 'Google Ads', 'Influencer', 'Content Production', 'Other'];
const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];
const TREND_RANGES = [
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function emptyExpense() {
  return { type: 'Marketing', category: 'Meta Ads', amount: 0, date: new Date().toISOString().slice(0, 10), notes: '' };
}

function inDateRange(dateStr, range) {
  if (range === 'all' || !dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === '30d') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 30);
    return d >= cutoff;
  }
  if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === 'year') return d.getFullYear() === now.getFullYear();
  return true;
}

function downloadCsv(rows) {
  const header = ['Channel', 'Date', 'Amount', 'Notes'];
  const lines = rows.map((r) => [r.category, r.date ? new Date(r.date).toLocaleDateString('en-IN') : '', r.amount, r.notes]);
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marketing-expense-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ChannelIcon({ channel }) {
  const map = {
    'Meta Ads': { bg: 'bg-blue-500/15', text: 'text-blue-400', path: <path d="M8 12c0-3 1.5-6 4-6s4 3 4 6-1.5 6-4 6-4-3-4-6Z" /> },
    'Google Ads': { bg: 'bg-amber-500/15', text: 'text-amber-400', path: <><circle cx="12" cy="12" r="7" /><path d="M12 5v7l5 3" /></> },
    Influencer: { bg: 'bg-pink-500/15', text: 'text-pink-400', path: <><circle cx="12" cy="8" r="3" /><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /></> },
    'Content Production': { bg: 'bg-purple-500/15', text: 'text-purple-400', path: <><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></> },
    Other: { bg: 'bg-gray-500/15', text: 'text-gray-400', path: <><path d="M20.6 12 12 3.4 3.4 12 12 20.6Z" /><circle cx="12" cy="12" r="1.5" /></> },
  };
  const cfg = map[channel] || map.Other;
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.text}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{cfg.path}</svg>
    </span>
  );
}

function StatCard({ icon, label, value, badge, sub }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
          {icon}
        </div>
        <p className="text-xs text-glacier">{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xl font-semibold text-[#F2F1EE]">{value}</p>
        {badge && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${badge.dir === 'up' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {badge.dir === 'up' ? '\u2191' : '\u2193'} {badge.pct}%
          </span>
        )}
      </div>
      <p className="text-xs text-glacier mt-1">{sub}</p>
    </div>
  );
}

function TrendChart({ months, values }) {
  const width = 640;
  const height = 160;
  const padL = 36;
  const padB = 20;
  const padT = 10;
  const max = Math.max(1, ...values);
  const niceMax = Math.ceil(max / 3000) * 3000 || 3000;
  const stepX = (width - padL - 10) / Math.max(1, months.length - 1);
  const points = values.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + (1 - v / niceMax) * (height - padT - padB);
    return [x, y];
  });
  const pathD = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-40">
      {[0, 0.5, 1].map((f) => (
        <text key={f} x={0} y={padT + f * (height - padT - padB) + 4} fontSize="10" fill="#8a8578">
          {'\u20B9'}{Math.round((niceMax * (1 - f)) / 1000)}K
        </text>
      ))}
      <path d={pathD} fill="none" stroke="#E8B563" strokeWidth="2" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#E8B563" />
      ))}
      {months.map((m, i) => (
        <text key={m} x={padL + i * stepX} y={height + 15} fontSize="10" fill="#8a8578" textAnchor="middle">
          {m}
        </text>
      ))}
    </svg>
  );
}

export default function MarketingPage() {
  const [rows, setRows] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExpense());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [trendRange, setTrendRange] = useState('thisYear');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/expenses?type=Marketing');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      setRows(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch('/api/sales').then((r) => r.json()).then(setSales).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyExpense());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      type: 'Marketing',
      category: row.category || 'Meta Ads',
      amount: row.amount || 0,
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this expense?')) return;
    const res = await fetch(`/api/expenses/${row._id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error || 'Delete failed');
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    const pageIds = pageRows.map((r) => r._id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected expense(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to delete one item');
        }
      }
      setSelectedIds([]);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = { ...form, amount: Number(form.amount) || 0 };
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/expenses/${editing._id}` : '/api/expenses';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function orderTotal(order) {
    return (order.items || []).reduce((sum, it) => sum + (it.qty || 0) * (it.sellingPrice || 0), 0) - (order.discount || 0);
  }

  function sumInMonth(list, dateKey, valueFn, month, year) {
    return list
      .filter((r) => r[dateKey] && new Date(r[dateKey]).getMonth() === month && new Date(r[dateKey]).getFullYear() === year)
      .reduce((s, r) => s + valueFn(r), 0);
  }

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  const spendThisMonth = sumInMonth(rows, 'date', (r) => r.amount || 0, thisMonth, thisYear);
  const spendLastMonth = sumInMonth(rows, 'date', (r) => r.amount || 0, lastMonth, lastMonthYear);
  const revenueThisMonth = sumInMonth(sales, 'orderDate', orderTotal, thisMonth, thisYear);
  const revenueLastMonth = sumInMonth(sales, 'orderDate', orderTotal, lastMonth, lastMonthYear);

  const pctOfRevenueThisMonth = revenueThisMonth ? (spendThisMonth / revenueThisMonth) * 100 : 0;
  const pctOfRevenueLastMonth = revenueLastMonth ? (spendLastMonth / revenueLastMonth) * 100 : 0;

  function pctChange(cur, prev) {
    if (!prev) return null;
    const change = ((cur - prev) / prev) * 100;
    return { dir: change >= 0 ? 'up' : 'down', pct: Math.abs(Math.round(change)) };
  }

  const spendBadge = pctChange(spendThisMonth, spendLastMonth);
  const revenueRatioBadge = pctChange(pctOfRevenueThisMonth, pctOfRevenueLastMonth);

  const channelTotalsThisMonth = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.date && new Date(r.date).getMonth() === thisMonth && new Date(r.date).getFullYear() === thisYear) {
        map[r.category] = (map[r.category] || 0) + (r.amount || 0);
      }
    });
    return map;
  }, [rows, thisMonth, thisYear]);
  const topChannel = Object.entries(channelTotalsThisMonth).sort((a, b) => b[1] - a[1])[0];

  const trendYear = trendRange === 'thisYear' ? thisYear : thisYear - 1;
  const trendMonthCount = trendRange === 'thisYear' ? thisMonth + 1 : 12;
  const trendMonths = MONTH_LABELS.slice(0, trendMonthCount);
  const trendValues = trendMonths.map((_, i) => sumInMonth(rows, 'date', (r) => r.amount || 0, i, trendYear));

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const dateStr = r.date ? new Date(r.date).toLocaleDateString('en-IN') : '';
      if (q && !`${r.category} ${dateStr} ${r.notes}`.toLowerCase().includes(q)) return false;
      if (!inDateRange(r.date, filterDateRange)) return false;
      return true;
    })
    .sort((a, b) => {
      function val(r) {
        if (sortKey === 'date') return r.date ? new Date(r.date).getTime() : 0;
        if (sortKey === 'amount') return Number(r.amount) || 0;
        return r[sortKey] ?? '';
      }
      const av = val(a);
      const bv = val(b);
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortArrow({ column }) {
    if (sortKey !== column) return <span className="text-glacier/40 ml-1">{'\u2195'}</span>;
    return <span className="text-gold ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-glacier mb-1">Finance /</p>
          <h1 className="text-3xl font-semibold">
            <span className="text-[#F2F1EE]">Marketing </span>
            <span className="text-[#E8B563]">Expense</span>
          </h1>
          <p className="text-sm text-glacier mt-1">Track and manage your marketing spends across all channels.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden md:block text-sm italic text-[#E8B563]/80 text-right max-w-[220px]">
            “Invest in what grows<br />your brand.”
          </p>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openCreate}
          >
            + Add Marketing Expense
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12.5" y="8" width="3" height="10" /><rect x="18" y="5" width="3" height="13" /></svg>}
            label="Total Marketing Spend"
            value={`\u20B9${spendThisMonth.toLocaleString('en-IN')}`}
            badge={spendBadge}
            sub="This month"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.2 15a9 9 0 1 1-3.8-9.9" /><path d="M12 3v9l7 3" /></svg>}
            label="% of Revenue"
            value={`${pctOfRevenueThisMonth.toFixed(1)}%`}
            badge={revenueRatioBadge}
            sub="Marketing spend ratio"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <StatCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>}
            label="Top Channel"
            value={topChannel ? topChannel[0] : '\u2014'}
            sub="Highest spend this month"
          />
        </div>
        <div className="flex-[1.6] min-w-[280px] card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-[#F2F1EE]">Marketing Spend Trend</p>
            <Dropdown value={trendRange} onChange={setTrendRange} options={TREND_RANGES} />
          </div>
          <TrendChart months={trendMonths} values={trendValues} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier flex-1 min-w-[220px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
              placeholder={'Search by channel, date or notes\u2026'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Dropdown value={filterDateRange} onChange={(v) => { setFilterDateRange(v); setPage(1); }} options={DATE_RANGES} />
            <button
              type="button"
              className="flex items-center gap-2 text-sm px-4 py-3 rounded-full border border-white/10 text-[#F2F1EE] hover:bg-white/5 whitespace-nowrap"
              onClick={() => downloadCsv(filteredRows)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">{'Loading\u2026'}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-glacier">No expenses match your filters.</p>
        ) : (
          <>
          <table className="w-full">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r._id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('category')}>Channel<SortArrow column="category" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('date')}>Date<SortArrow column="date" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('amount')}>Amount<SortArrow column="amount" /></th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row._id)}
                      onChange={() => toggleSelect(row._id)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={row.category} />
                      {row.category}
                    </div>
                  </td>
                  <td>{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '\u2014'}</td>
                  <td>{'\u20B9'}{(row.amount || 0).toLocaleString('en-IN')}</td>
                  <td>{row.notes || '\u2014'}</td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] hover:bg-[#E8B563]/10"
                        onClick={() => openEdit(row)}
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg border border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-400/10"
                        onClick={() => handleDelete(row)}
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-4 text-xs text-glacier">
            <span>
              {selectedIds.length > 0 ? (
                <button type="button" className="text-red-400 hover:underline" onClick={handleBulkDelete}>
                  Delete Selected ({selectedIds.length})
                </button>
              ) : (
                `Showing ${(currentPage - 1) * pageSize + 1}\u2013${Math.min(currentPage * pageSize, filteredRows.length)} of ${filteredRows.length} expense${filteredRows.length === 1 ? '' : 's'}`
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="w-7 h-7 rounded-full border border-white/10 disabled:opacity-30"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {'\u2039'}
              </button>
              <span className="w-6 h-6 rounded-full bg-gold text-black flex items-center justify-center text-[11px] font-semibold">
                {currentPage}
              </span>
              <button
                className="w-7 h-7 rounded-full border border-white/10 disabled:opacity-30"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {'\u203A'}
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      <div className="card mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#E8B563] mt-0.5 shrink-0"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" /></svg>
          <p className="text-sm text-glacier">Marketing spend as % of revenue is shown on the main Dashboard.</p>
        </div>
        <button
          type="button"
          className="text-sm font-semibold px-5 py-2.5 rounded-full border border-[#E8B563]/40 text-[#E8B563] hover:bg-[#E8B563]/10 whitespace-nowrap flex items-center gap-2"
        >
          View Detailed Report
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-[#131215] border border-[#E8B563]/30 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto text-[#F2F1EE] shadow-[0_0_60px_rgba(232,181,99,0.08)]"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[#E8B563]/40 flex items-center justify-center text-[#E8B563]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12.5" y="8" width="3" height="10" /><rect x="18" y="5" width="3" height="13" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Marketing Expense</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this expense.' : 'Log a new marketing spend.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Channel</label>
                <Dropdown
                  value={form.category}
                  onChange={(v) => updateField('category', v)}
                  options={CHANNELS.map((c) => ({ value: c, label: c }))}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Amount ({'\u20B9'})</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={form.amount}
                    required
                    onChange={(e) => updateField('amount', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Date</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="date"
                  value={form.date}
                  required
                  onChange={(e) => updateField('date', e.target.value)}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Notes</label>
              <textarea
                className="input bg-black/30 border-white/10 text-[#F2F1EE] placeholder:text-glacier"
                rows={3}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-[#F2F1EE] hover:bg-white/5"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)]"
                disabled={saving}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
                {saving ? 'Saving\u2026' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
