'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

const STATUSES = ['Pending Pickup', 'In Transit', 'Delivered', 'RTO', 'Lost'];
const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];
const STATUS_STYLE = {
  'Pending Pickup': 'bg-amber-500/15 text-amber-400',
  'In Transit': 'bg-blue-500/15 text-blue-400',
  Delivered: 'bg-emerald-500/15 text-emerald-400',
  RTO: 'bg-orange-500/15 text-orange-400',
  Lost: 'bg-red-500/15 text-red-400',
};

function emptyShipment() {
  return {
    orderId: '',
    courier: '',
    awb: '',
    shippingCost: 0,
    codAmount: 0,
    status: 'Pending Pickup',
    dispatchDate: '',
    deliveryDate: '',
    notes: '',
  };
}

function inDateRange(dateStr, range) {
  if (range === 'all' || !dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === '7d') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7);
    return d >= cutoff;
  }
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
  const header = ['Order ID', 'Courier', 'AWB', 'Shipping Cost', 'COD Amount', 'Status', 'Dispatched', 'Delivered'];
  const lines = rows.map((r) => [
    r.orderId,
    r.courier,
    r.awb,
    r.shippingCost,
    r.codAmount,
    r.status,
    r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '',
    r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString('en-IN') : '',
  ]);
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shipping-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ProgressBar({ pct, color }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function StatCard({ icon, value, label, sub, pct, barColor }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-xs text-glacier leading-tight">{label}</p>
          <p className="text-lg font-semibold text-[#F2F1EE] leading-tight">{value}</p>
        </div>
      </div>
      {pct != null ? <ProgressBar pct={pct} color={barColor} /> : sub ? <p className="text-xs text-glacier mt-2">{sub}</p> : null}
    </div>
  );
}

export default function ShippingPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyShipment());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [filterCourier, setFilterCourier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState('dispatchDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/shipments');
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
    setForm(emptyShipment());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      orderId: row.orderId || '',
      courier: row.courier || '',
      awb: row.awb || '',
      shippingCost: row.shippingCost || 0,
      codAmount: row.codAmount || 0,
      status: row.status || 'Pending Pickup',
      dispatchDate: row.dispatchDate ? new Date(row.dispatchDate).toISOString().slice(0, 10) : '',
      deliveryDate: row.deliveryDate ? new Date(row.deliveryDate).toISOString().slice(0, 10) : '',
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this shipment?')) return;
    const res = await fetch(`/api/shipments/${row._id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error || 'Delete failed');
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
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
    if (!confirm(`Delete ${selectedIds.length} selected shipment(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/shipments/${id}`, { method: 'DELETE' });
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
    const payload = {
      ...form,
      shippingCost: Number(form.shippingCost) || 0,
      codAmount: Number(form.codAmount) || 0,
    };
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/shipments/${editing._id}` : '/api/shipments';
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

  // --- Dashboard stats (this month) ---
  const now = new Date();
  const thisMonthRows = rows.filter(
    (r) => r.dispatchDate && new Date(r.dispatchDate).getMonth() === now.getMonth() && new Date(r.dispatchDate).getFullYear() === now.getFullYear()
  );
  const totalOrders = thisMonthRows.length;
  const deliveredCount = thisMonthRows.filter((r) => r.status === 'Delivered').length;
  const inTransitCount = thisMonthRows.filter((r) => r.status === 'In Transit').length;
  const pendingCount = thisMonthRows.filter((r) => r.status === 'Pending Pickup').length;
  const pct = (n) => (totalOrders ? Math.round((n / totalOrders) * 100) : 0);

  const courierOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.courier).filter(Boolean))), [rows]);

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (q && !`${r.orderId} ${r.awb} ${r.courier}`.toLowerCase().includes(q)) return false;
      if (filterCourier !== 'All' && r.courier !== filterCourier) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      if (!inDateRange(r.dispatchDate, filterDateRange)) return false;
      return true;
    })
    .sort((a, b) => {
      function val(r) {
        if (sortKey === 'dispatchDate') return r.dispatchDate ? new Date(r.dispatchDate).getTime() : 0;
        if (sortKey === 'shippingCost' || sortKey === 'codAmount') return Number(r[sortKey]) || 0;
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
          <p className="text-xs text-glacier mb-1">Operations /</p>
          <h1 className="text-3xl font-semibold">
            <span className="text-[#F2F1EE]">Shipping &amp; </span>
            <span className="text-[#E8B563]">Logistics</span>
          </h1>
          <p className="text-sm text-glacier mt-1">Track, manage and streamline your orders from dispatch to delivery.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden md:block text-sm italic text-[#E8B563]/80 text-right max-w-[220px]">
            “Faster deliveries<br />happier customers.”
          </p>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openCreate}
          >
            + Add Shipping &amp; Logistics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>}
          label="Total Orders"
          value={totalOrders}
          sub="This month"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="6" width="14" height="10" rx="1.5" /><path d="M15 10h4l3 3v3h-7z" /><circle cx="6" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" /></svg>}
          label="Delivered"
          value={deliveredCount}
          pct={pct(deliveredCount)}
          barColor="#34d399"
          sub={`${pct(deliveredCount)}% completion`}
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>}
          label="In Transit"
          value={inTransitCount}
          pct={pct(inTransitCount)}
          barColor="#60a5fa"
          sub={`${pct(inTransitCount)}%`}
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.27 6.96 12 12l8.73-5.04" /><path d="M12 22.08V12" /></svg>}
          label="Pending"
          value={pendingCount}
          pct={pct(pendingCount)}
          barColor="#f59e0b"
          sub={`${pct(pendingCount)}%`}
        />
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier flex-1 min-w-[220px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
              placeholder={'Search by Order ID, AWB, Courier\u2026'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Dropdown value={filterDateRange} onChange={(v) => { setFilterDateRange(v); setPage(1); }} options={DATE_RANGES} />
            <Dropdown
              value={filterCourier}
              onChange={(v) => { setFilterCourier(v); setPage(1); }}
              options={[{ value: 'All', label: 'All Couriers' }, ...courierOptions.map((c) => ({ value: c, label: c }))]}
            />
            <Dropdown
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setPage(1); }}
              options={[{ value: 'All', label: 'All Status' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            />
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
          <p className="text-sm text-glacier">No shipments match your filters.</p>
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
                <th className="cursor-pointer select-none" onClick={() => toggleSort('orderId')}>Order ID<SortArrow column="orderId" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('courier')}>Courier<SortArrow column="courier" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('awb')}>AWB<SortArrow column="awb" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('shippingCost')}>Shipping Cost<SortArrow column="shippingCost" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('codAmount')}>COD Amount<SortArrow column="codAmount" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status<SortArrow column="status" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('dispatchDate')}>Dispatched<SortArrow column="dispatchDate" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <Fragment key={row._id}>
                <tr>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row._id)}
                      onChange={() => toggleSelect(row._id)}
                    />
                  </td>
                  <td>{row.orderId}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full border border-[#E8B563]/40 bg-[#E8B563]/10 text-[#E8B563] flex items-center justify-center shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="6" width="14" height="10" rx="1.5" /><path d="M15 10h4l3 3v3h-7z" /><circle cx="6" cy="18.5" r="1.5" /><circle cx="17.5" cy="18.5" r="1.5" /></svg>
                      </span>
                      {row.courier || '\u2014'}
                    </div>
                  </td>
                  <td>{row.awb || '\u2014'}</td>
                  <td>{'\u20B9'}{row.shippingCost || 0}</td>
                  <td>{'\u20B9'}{row.codAmount || 0}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${STATUS_STYLE[row.status] || 'bg-gray-500/15 text-gray-400'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {row.status}
                    </span>
                  </td>
                  <td>{row.dispatchDate ? new Date(row.dispatchDate).toLocaleDateString('en-IN') : '\u2014'}</td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE] hover:bg-white/5"
                        onClick={() => toggleExpand(row._id)}
                        title="View details"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </button>
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
                {expandedId === row._id && (
                  <tr>
                    <td colSpan={9} className="bg-black/20">
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-glacier mb-1">Delivery Date</p>
                          <p className="text-[#F2F1EE]">{row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString('en-IN') : '\u2014'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-glacier mb-1">Notes</p>
                          <p className="text-[#F2F1EE]">{row.notes || '\u2014'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
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
                `Showing ${(currentPage - 1) * pageSize + 1}\u2013${Math.min(currentPage * pageSize, filteredRows.length)} of ${filteredRows.length} orders`
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

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-[#131215] border border-[#E8B563]/30 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-[#F2F1EE] shadow-[0_0_60px_rgba(232,181,99,0.08)]"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[#E8B563]/40 flex items-center justify-center text-[#E8B563]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="6" width="14" height="10" rx="1.5" /><path d="M15 10h4l3 3v3h-7z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Shipment</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this shipment.' : 'Add a new shipment.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Order ID</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.orderId}
                  required
                  onChange={(e) => updateField('orderId', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Courier</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.courier}
                  onChange={(e) => updateField('courier', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">AWB Number</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.awb}
                  onChange={(e) => updateField('awb', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Status</label>
                <Dropdown
                  value={form.status}
                  onChange={(v) => updateField('status', v)}
                  options={STATUSES.map((v) => ({ value: v, label: v }))}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Shipping Cost</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={form.shippingCost}
                    onChange={(e) => updateField('shippingCost', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">COD Amount</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={form.codAmount}
                    onChange={(e) => updateField('codAmount', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Dispatch Date</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="date"
                  value={form.dispatchDate}
                  onChange={(e) => updateField('dispatchDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Delivery Date</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) => updateField('deliveryDate', e.target.value)}
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
