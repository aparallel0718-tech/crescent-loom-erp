'use client';
import { useEffect, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

function emptyForm() {
  return {
    product: '',
    sku: '',
    period: '',
    opening: 0,
    purchased: 0,
    sold: 0,
    returned: 0,
    exchanged: 0,
    damaged: 0,
    consumables: 0,
    warehouse: '',
    notes: '',
  };
}

function currentStock(row) {
  if (row.currentStock != null) return row.currentStock;
  return (
    (row.opening || 0) +
    (row.purchased || 0) -
    (row.sold || 0) +
    (row.returned || 0) -
    (row.exchanged || 0) -
    (row.damaged || 0) -
    (row.consumables || 0)
  );
}

export default function InventoryPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('All');
  const [filterWarehouse, setFilterWarehouse] = useState('All');
  const [sortKey, setSortKey] = useState('sku');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      setRows(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    load();
    loadProducts();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      product: row.product?._id || row.product || '',
      sku: row.sku || '',
      period: row.period || '',
      opening: row.opening || 0,
      purchased: row.purchased || 0,
      sold: row.sold || 0,
      returned: row.returned || 0,
      exchanged: row.exchanged || 0,
      damaged: row.damaged || 0,
      consumables: row.consumables || 0,
      warehouse: row.warehouse || '',
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        opening: Number(form.opening) || 0,
        purchased: Number(form.purchased) || 0,
        sold: Number(form.sold) || 0,
        returned: Number(form.returned) || 0,
        exchanged: Number(form.exchanged) || 0,
        damaged: Number(form.damaged) || 0,
        consumables: Number(form.consumables) || 0,
      };
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/inventory/${editing._id}` : '/api/inventory';
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

  async function handleDelete(row) {
    if (!confirm(`Delete inventory row for ${row.sku || row.product?.sku || 'this item'}?`)) return;
    const res = await fetch(`/api/inventory/${row._id}`, { method: 'DELETE' });
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
    if (!confirm(`Delete ${selectedIds.length} selected row(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
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

  const productOptions = [...new Set(rows.map((r) => r.product?.name).filter(Boolean))];
  const warehouseOptions = [...new Set(rows.map((r) => r.warehouse).filter(Boolean))];

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const sku = r.product?.sku || r.sku || '';
      const name = r.product?.name || '';
      if (q && !`${sku} ${name}`.toLowerCase().includes(q)) return false;
      if (filterProduct !== 'All' && name !== filterProduct) return false;
      if (filterWarehouse !== 'All' && r.warehouse !== filterWarehouse) return false;
      return true;
    })
    .sort((a, b) => {
      function val(r) {
        if (sortKey === 'sku') return r.product?.sku || r.sku || '';
        if (sortKey === 'product') return r.product?.name || '';
        if (sortKey === 'currentStock') return currentStock(r);
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
        <h1 className="text-2xl font-semibold text-[#F2F1EE]">Inventory</h1>
        {selectedIds.length > 0 && (
          <button
            type="button"
            className="text-xs text-red-400 border border-red-400/40 rounded-full px-3 py-2 hover:bg-red-400/10"
            onClick={handleBulkDelete}
          >
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
            placeholder={'Search by SKU or product\u2026'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Dropdown
            className="flex-1"
            value={filterProduct}
            onChange={(v) => { setFilterProduct(v); setPage(1); }}
            options={[{ value: 'All', label: 'Product: All' }, ...productOptions.map((p) => ({ value: p, label: p }))]}
          />
          <Dropdown
            className="flex-1"
            value={filterWarehouse}
            onChange={(v) => { setFilterWarehouse(v); setPage(1); }}
            options={[{ value: 'All', label: 'Warehouse: All' }, ...warehouseOptions.map((w) => ({ value: w, label: w }))]}
          />
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openAdd}
          >
            + Add Inventory
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">{'Loading\u2026'}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-glacier">No inventory rows match your filters.</p>
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
                <th className="cursor-pointer select-none" onClick={() => toggleSort('sku')}>SKU<SortArrow column="sku" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('product')}>Product<SortArrow column="product" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('opening')}>Opening<SortArrow column="opening" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('purchased')}>Purchase<SortArrow column="purchased" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('sold')}>Sold<SortArrow column="sold" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('returned')}>Return<SortArrow column="returned" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('exchanged')}>Exchange<SortArrow column="exchanged" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('damaged')}>Damaged<SortArrow column="damaged" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('consumables')}>Consumables<SortArrow column="consumables" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('currentStock')}>Current Stock<SortArrow column="currentStock" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('warehouse')}>Warehouse<SortArrow column="warehouse" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const stock = currentStock(row);
                return (
                  <tr key={row._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row._id)}
                        onChange={() => toggleSelect(row._id)}
                      />
                    </td>
                    <td>{row.product?.sku || row.sku}</td>
                    <td>{row.product?.name || '\u2014'}</td>
                    <td>{row.opening}</td>
                    <td>{row.purchased}</td>
                    <td>{row.sold}</td>
                    <td>{row.returned}</td>
                    <td>{row.exchanged}</td>
                    <td>{row.damaged}</td>
                    <td>{row.consumables}</td>
                    <td>
                      <span className={stock <= 0 ? 'text-red-400 font-semibold' : 'text-[#F2F1EE]'}>{stock}</span>
                    </td>
                    <td>{row.warehouse}</td>
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
              Showing {(currentPage - 1) * pageSize + 1}{'\u2013'}{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} rows
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Inventory</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this stock ledger row.' : 'Add a new stock ledger row.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Product</label>
                <Dropdown
                  value={form.product}
                  onChange={(v) => updateField('product', v)}
                  options={[{ value: '', label: 'Select product' }, ...products.map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))]}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">SKU (optional override)</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" value={form.sku} onChange={(e) => updateField('sku', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">{'Period (e.g. 2026-08)'}</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" value={form.period} onChange={(e) => updateField('period', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Opening Stock</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.opening} onChange={(e) => updateField('opening', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Purchased</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.purchased} onChange={(e) => updateField('purchased', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Sold</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.sold} onChange={(e) => updateField('sold', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Returned</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.returned} onChange={(e) => updateField('returned', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Exchanged</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.exchanged} onChange={(e) => updateField('exchanged', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Damaged</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.damaged} onChange={(e) => updateField('damaged', e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Consumables</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" type="number" value={form.consumables} onChange={(e) => updateField('consumables', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Warehouse / Location</label>
                <input className="input bg-black/30 border-white/10 text-[#F2F1EE]" value={form.warehouse} onChange={(e) => updateField('warehouse', e.target.value)} />
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
