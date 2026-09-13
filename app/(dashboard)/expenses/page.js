'use client';
import { useEffect, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

const CATEGORIES = ['Business Related', 'E-Commerce', 'Marketing', 'Finance', 'Other'];
const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];
const CATEGORY_DOT = {
  'Business Related': 'bg-amber-400',
  'E-Commerce': 'bg-purple-400',
  Marketing: 'bg-pink-400',
  Finance: 'bg-blue-400',
  Other: 'bg-gray-400',
};

function emptyExpense() {
  return { type: 'Operating', category: 'Business Related', amount: 0, date: new Date().toISOString().slice(0, 10), notes: '' };
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
  const header = ['Category', 'Date', 'Amount', 'Notes'];
  const lines = rows.map((r) => [r.category, r.date ? new Date(r.date).toLocaleDateString('en-IN') : '', r.amount, r.notes]);
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `operating-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-glacier leading-tight">{label}</p>
        <p className="text-lg font-semibold text-[#F2F1EE] leading-tight">{value}</p>
        <p className="text-xs text-glacier leading-tight mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExpense());
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/expenses?type=Operating');
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
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyExpense());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      type: 'Operating',
      category: row.category || 'Business Related',
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

  // --- Dashboard stats ---
  const totalExpenses = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const transactionCount = rows.length;
  const categoryTotals = {};
  rows.forEach((r) => {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + 1;
  });
  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const dateStr = r.date ? new Date(r.date).toLocaleDateString('en-IN') : '';
      if (q && !`${r.category} ${dateStr} ${r.notes}`.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'All' && r.category !== filterCategory) return false;
      if (!inDateRange(r.date, filterDateRange)) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a.date ? new Date(a.date).getTime() : 0;
      const bv = b.date ? new Date(b.date).getTime() : 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold">
            <span className="text-[#F2F1EE]">Operating </span>
            <span className="text-[#E8B563]">Expenses</span>
          </h1>
          <p className="text-sm text-glacier mt-1">Track and manage your day-to-day business expenses.</p>
        </div>
        <button
          className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
          onClick={openCreate}
        >
          + Add Operating Expenses
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4" /><path d="M20 12h-4a2 2 0 0 0 0 4h4v-4Z" /></svg>}
          label="Total Expenses"
          value={`\u20B9${totalExpenses.toLocaleString('en-IN')}`}
          sub={`Across ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>}
          label="Transactions"
          value={transactionCount}
          sub="Total expense entries"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21.2 15a9 9 0 1 1-3.8-9.9" /><path d="M12 3v9l7 3" /></svg>}
          label="Top Category"
          value={topCategoryEntry ? topCategoryEntry[0] : '\u2014'}
          sub={topCategoryEntry ? `${topCategoryEntry[1]} of ${transactionCount} transactions` : ''}
        />
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier flex-1 min-w-[220px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
              placeholder={'Search expenses, notes or category\u2026'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Dropdown
              value={filterCategory}
              onChange={(v) => { setFilterCategory(v); setPage(1); }}
              options={[{ value: 'All', label: 'All Categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
            />
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
                <th>#</th>
                <th>Category</th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                >
                  <span className="inline-flex items-center gap-1">
                    Date
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={sortDir === 'asc' ? 'rotate-180' : ''}>
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>
                </th>
                <th>Amount</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={row._id}>
                  <td className="text-glacier">{(currentPage - 1) * pageSize + i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${CATEGORY_DOT[row.category] || 'bg-gray-400'}`} />
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
                        className="w-8 h-8 rounded-lg bg-[#E8B563]/15 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] hover:bg-[#E8B563]/25"
                        onClick={() => openEdit(row)}
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-400/30 flex items-center justify-center text-red-400 hover:bg-red-500/25"
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
              Showing {(currentPage - 1) * pageSize + 1}{'\u2013'}{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} expense{filteredRows.length === 1 ? '' : 's'}
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

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-[#131215] border border-[#E8B563]/30 rounded-2xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto text-[#F2F1EE] shadow-[0_0_60px_rgba(232,181,99,0.08)]"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[#E8B563]/40 flex items-center justify-center text-[#E8B563]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4" /><path d="M20 12h-4a2 2 0 0 0 0 4h4v-4Z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Operating Expense</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this expense.' : 'Log a new operating expense.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Category</label>
                <Dropdown
                  value={form.category}
                  onChange={(v) => updateField('category', v)}
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
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
