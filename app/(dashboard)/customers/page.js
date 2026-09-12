'use client';
import { useEffect, useState } from 'react';

function emptyCustomer() {
  return { name: '', phone: '', email: '', location: '', notes: '' };
}

function orderTotal(order) {
  return (order.items || []).reduce((sum, it) => sum + (it.qty || 0) * (it.sellingPrice || 0), 0) - (order.discount || 0);
}

function buildSalesStats(sales) {
  const map = {};
  for (const s of sales) {
    const keys = [s.customer, s.customerName].filter(Boolean);
    if (keys.length === 0) continue;
    const total = orderTotal(s);
    for (const key of keys) {
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += total;
    }
  }
  return map;
}

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [salesByCustomer, setSalesByCustomer] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCustomer());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers');
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
    fetch('/api/sales')
      .then((r) => r.json())
      .then((sales) => setSalesByCustomer(buildSalesStats(sales)))
      .catch(() => {});
  }, []);

  function statsFor(row) {
    return salesByCustomer[row._id] || salesByCustomer[row.name] || { count: 0, total: 0 };
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyCustomer());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || '',
      phone: row.phone || '',
      email: row.email || '',
      location: row.location || '',
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this customer?')) return;
    const res = await fetch(`/api/customers/${row._id}`, { method: 'DELETE' });
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
    if (!confirm(`Delete ${selectedIds.length} selected customer(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
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
      name: form.name,
      phone: form.phone,
      email: form.email,
      location: form.location,
      notes: form.notes,
    };
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/customers/${editing._id}` : '/api/customers';
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

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (q && !`${r.name} ${r.phone} ${r.email} ${r.location}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      function val(r) {
        const stat = statsFor(r);
        if (sortKey === 'totalOrders') return stat.count;
        if (sortKey === 'avgSpent') return stat.count ? stat.total / stat.count : -1;
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#E8B563]">Customers</h1>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="text-xs text-red-400 border border-red-400/40 rounded-full px-3 py-2 hover:bg-red-400/10"
              onClick={handleBulkDelete}
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openCreate}
          >
            + Add Customer
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
            placeholder={'Search by name, phone, email, location\u2026'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">{'Loading\u2026'}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-glacier">No customers match your search.</p>
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
                <th className="cursor-pointer select-none" onClick={() => toggleSort('phone')}>Phone No.<SortArrow column="phone" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('email')}>Email<SortArrow column="email" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('location')}>Location<SortArrow column="location" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('totalOrders')}>Total Orders<SortArrow column="totalOrders" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('avgSpent')}>Avg Spent<SortArrow column="avgSpent" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const stat = statsFor(row);
                return (
                  <tr key={row._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row._id)}
                        onChange={() => toggleSelect(row._id)}
                      />
                    </td>
                    <td>{row.name}</td>
                    <td>{row.phone || '\u2014'}</td>
                    <td>{row.email || '\u2014'}</td>
                    <td>{row.location || '\u2014'}</td>
                    <td>{stat.count}</td>
                    <td>{stat.count ? `\u20B9${Math.round(stat.total / stat.count)}` : '\u2014'}</td>
                    <td className="relative text-right">
                      <button
                        className="text-glacier hover:text-[#F2F1EE] px-2"
                        onClick={() => setOpenMenuId(openMenuId === row._id ? null : row._id)}
                      >
                        {'\u2022\u2022\u2022'}
                      </button>
                      {openMenuId === row._id && (
                        <div className="absolute right-0 mt-1 w-32 bg-[#131215] border border-white/10 rounded-lg shadow-xl z-20 text-left">
                          <button
                            className="block w-full text-left text-xs px-3 py-2 text-gold hover:bg-white/5"
                            onClick={() => { setOpenMenuId(null); openEdit(row); }}
                          >
                            Edit
                          </button>
                          <button
                            className="block w-full text-left text-xs px-3 py-2 text-red-400 hover:bg-white/5"
                            onClick={() => { setOpenMenuId(null); handleDelete(row); }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-4 text-xs text-glacier">
            <span>{selectedIds.length} selected</span>
            <span>
              Showing {(currentPage - 1) * pageSize + 1}{'\u2013'}{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} customers
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Customer</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this customer.' : 'Add a new customer.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Name</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.name}
                  required
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Phone No.</label>
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
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Location</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
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
