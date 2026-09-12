'use client';
import { useEffect, useMemo, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

const STATUSES = ['Active', 'Inactive'];
const STATUS_STYLE = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Inactive: 'bg-gray-500/15 text-gray-400',
};

function emptySupplier() {
  return { name: '', contactPerson: '', phone: '', email: '', address: '', gstin: '', notes: '', status: 'Active' };
}

function downloadCsv(rows) {
  const header = ['Name', 'Contact Person', 'Phone', 'Email', 'GSTIN', 'Status'];
  const lines = rows.map((r) => [r.name, r.contactPerson, r.phone, r.email, r.gstin, r.status || 'Active']);
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ icon, value, label, sub }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-[#E8B563]/10 border border-[#E8B563]/30 flex items-center justify-center text-[#E8B563] shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold text-[#F2F1EE] leading-tight">{value}</p>
        <p className="text-xs text-glacier leading-tight">{sub}</p>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySupplier());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/suppliers');
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
    fetch('/api/purchases').then((r) => r.json()).then(setPurchases).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptySupplier());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || '',
      contactPerson: row.contactPerson || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      gstin: row.gstin || '',
      notes: row.notes || '',
      status: row.status || 'Active',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this supplier?')) return;
    const res = await fetch(`/api/suppliers/${row._id}`, { method: 'DELETE' });
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
    if (!confirm(`Delete ${selectedIds.length} selected supplier(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
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
    const payload = { ...form };
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/suppliers/${editing._id}` : '/api/suppliers';
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
  const totalSuppliers = rows.length;
  const activeSuppliers = rows.filter((r) => (r.status || 'Active') === 'Active').length;
  const inactiveSuppliers = rows.filter((r) => r.status === 'Inactive').length;
  const suppliersWithOrders = useMemo(() => {
    const names = new Set(purchases.map((p) => p.supplierName).filter(Boolean));
    const ids = new Set(purchases.map((p) => p.supplier).filter(Boolean));
    return rows.filter((r) => names.has(r.name) || ids.has(r._id)).length;
  }, [rows, purchases]);

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (q && !`${r.name} ${r.contactPerson} ${r.gstin}`.toLowerCase().includes(q)) return false;
      if (filterStatus !== 'All' && (r.status || 'Active') !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      function val(r) {
        if (sortKey === 'status') return r.status || 'Active';
        return r[sortKey] ?? '';
      }
      const av = val(a);
      const bv = val(b);
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
          <h1 className="text-3xl font-semibold text-[#E8B563]">Suppliers</h1>
          <p className="text-sm text-glacier mt-1">Manage your suppliers and contact details.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden md:block text-sm italic text-[#E8B563]/80 text-right max-w-[220px]">
            “Strong suppliers<br />build stronger businesses.”
          </p>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openCreate}
          >
            + Add Supplier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
          value={totalSuppliers}
          sub="Registered suppliers"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 9h1M9 13h1M14 9h1M14 13h1" /></svg>}
          value={activeSuppliers}
          sub="Currently active"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M10 9v6" /><path d="M14 9v6" /></svg>}
          value={inactiveSuppliers}
          sub="Temporarily inactive"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17h1v-5l2-5h9l2 5h3v5h-2" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></svg>}
          value={suppliersWithOrders}
          sub="Have purchase orders"
        />
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier flex-1 min-w-[220px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
              placeholder={'Search suppliers by name, contact person or GSTIN\u2026'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
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
          <p className="text-sm text-glacier">No suppliers match your filters.</p>
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
                <th className="cursor-pointer select-none" onClick={() => toggleSort('name')}>Name<SortArrow column="name" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('contactPerson')}>Contact Person<SortArrow column="contactPerson" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('phone')}>Phone<SortArrow column="phone" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('email')}>Email<SortArrow column="email" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('gstin')}>GSTIN<SortArrow column="gstin" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status<SortArrow column="status" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const status = row.status || 'Active';
                return (
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
                        <span className="w-7 h-7 rounded-full border border-[#E8B563]/40 bg-[#E8B563]/10 text-[#E8B563] text-xs font-semibold flex items-center justify-center shrink-0">
                          {(row.name || '?').charAt(0).toUpperCase()}
                        </span>
                        {row.name}
                      </div>
                    </td>
                    <td>{row.contactPerson || '\u2014'}</td>
                    <td>{row.phone || '\u2014'}</td>
                    <td>{row.email || '\u2014'}</td>
                    <td>{row.gstin || '\u2014'}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${STATUS_STYLE[status] || 'bg-gray-500/15 text-gray-400'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {status}
                      </span>
                    </td>
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
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-4 text-xs text-glacier">
            <span>
              {selectedIds.length > 0 ? (
                <button
                  type="button"
                  className="text-red-400 hover:underline"
                  onClick={handleBulkDelete}
                >
                  Delete Selected ({selectedIds.length})
                </button>
              ) : (
                `Showing ${(currentPage - 1) * pageSize + 1}\u2013${Math.min(currentPage * pageSize, filteredRows.length)} of ${filteredRows.length} supplier${filteredRows.length === 1 ? '' : 's'}`
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Supplier</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this supplier.' : 'Add a new supplier.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Supplier Name</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.name}
                  required
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Contact Person</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.contactPerson}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Phone</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Email</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">GSTIN</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.gstin}
                  onChange={(e) => updateField('gstin', e.target.value)}
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
            </div>

            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Address</label>
              <textarea
                className="input bg-black/30 border-white/10 text-[#F2F1EE] placeholder:text-glacier"
                rows={2}
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
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
