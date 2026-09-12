'use client';
import { useEffect, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

const PAYMENT_MODES = ['Prepaid', 'COD', 'Card', 'UPI', 'Bank Transfer'];
const STATUSES = ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Cancelled'];
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const STATUS_STYLE = {
  Placed: 'bg-amber-500/15 text-amber-400',
  Confirmed: 'bg-blue-500/15 text-blue-400',
  Shipped: 'bg-blue-500/15 text-blue-400',
  Delivered: 'bg-emerald-500/15 text-emerald-400',
  Returned: 'bg-red-500/15 text-red-400',
  Cancelled: 'bg-gray-500/15 text-gray-400',
};

function groupByDesign(products) {
  const map = {};
  for (const p of products) {
    const parts = (p.sku || '').split('-');
    const designKey = parts.length > 1 ? parts.slice(0, -1).join('-') : p.sku || p._id;
    if (!map[designKey]) {
      map[designKey] = { key: designKey, name: p.name, colour: p.colour, variants: [] };
    }
    map[designKey].variants.push(p);
  }
  const designs = Object.values(map);
  designs.forEach((d) => {
    d.variants.sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.size);
      const bi = SIZE_ORDER.indexOf(b.size);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  });
  return designs;
}

function emptyItem() {
  return { designKey: '', size: '', product: '', productName: '', qty: 1, sellingPrice: 0, costPrice: 0 };
}

function emptyOrder() {
  return {
    orderId: '',
    orderDate: new Date().toISOString().slice(0, 10),
    customer: '',
    customerName: '',
    items: [emptyItem()],
    discount: 0,
    paymentMode: 'Prepaid',
    status: 'Placed',
    notes: '',
  };
}

function orderTotal(row) {
  return (row.items || []).reduce((sum, it) => sum + (it.qty || 0) * (it.sellingPrice || 0), 0) - (row.discount || 0);
}

export default function SalesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOrder());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState('orderDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 15;

  const designs = groupByDesign(products);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sales');
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
    fetch('/api/products').then((r) => r.json()).then(setProducts).catch(() => {});
    fetch('/api/customers').then((r) => r.json()).then(setCustomers).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyOrder());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    const bySku = {};
    products.forEach((p) => (bySku[p._id] = p));
    setForm({
      orderId: row.orderId || '',
      orderDate: row.orderDate ? new Date(row.orderDate).toISOString().slice(0, 10) : '',
      customer: row.customer || '',
      customerName: row.customerName || '',
      items:
        row.items && row.items.length
          ? row.items.map((it) => {
              const p = bySku[it.product];
              const parts = p ? (p.sku || '').split('-') : [];
              const designKey = p ? (parts.length > 1 ? parts.slice(0, -1).join('-') : p.sku) : '';
              return {
                designKey,
                size: it.size || (p ? p.size : ''),
                product: it.product || '',
                productName: it.productName || '',
                qty: it.qty || 1,
                sellingPrice: it.sellingPrice || 0,
                costPrice: it.costPrice || 0,
              };
            })
          : [emptyItem()],
      discount: row.discount || 0,
      paymentMode: row.paymentMode || 'Prepaid',
      status: row.status || 'Placed',
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this order?')) return;
    const res = await fetch(`/api/sales/${row._id}`, { method: 'DELETE' });
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
    if (!confirm(`Delete ${selectedIds.length} selected order(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
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

  function updateOrderField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateItemDesign(index, designKey) {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], designKey, size: '', product: '', productName: '' };
      return { ...prev, items };
    });
  }

  function updateItemSize(index, size) {
    setForm((prev) => {
      const items = [...prev.items];
      const design = designs.find((d) => d.key === items[index].designKey);
      const variant = design ? design.variants.find((v) => v.size === size) : null;
      items[index] = {
        ...items[index],
        size,
        product: variant ? variant._id : '',
        productName: variant ? variant.name : '',
        sellingPrice: variant ? variant.sellingPrice ?? items[index].sellingPrice : items[index].sellingPrice,
        costPrice: variant ? (variant.costPrice ?? items[index].costPrice) : items[index].costPrice,
      };
      return { ...prev, items };
    });
  }

  function updateItemField(index, key, value) {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, items };
    });
  }

  function addItemRow() {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItemRow(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  function updateCustomer(value) {
    const c = customers.find((cu) => cu._id === value);
    setForm((prev) => ({ ...prev, customer: value, customerName: c ? c.name : prev.customerName }));
  }

  const itemsTotal = form.items.reduce(
    (sum, it) => sum + (Number(it.qty) || 0) * (Number(it.sellingPrice) || 0),
    0
  );
  const netTotal = itemsTotal - (Number(form.discount) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const missing = form.items.some((it) => !it.product);
    if (missing) {
      setError('Select both a product and a size for every line.');
      return;
    }
    setSaving(true);
    const payload = {
      orderId: form.orderId,
      orderDate: form.orderDate,
      customer: form.customer,
      customerName: form.customerName,
      items: form.items.map((it) => ({
        product: it.product,
        productName: it.productName,
        size: it.size,
        qty: Number(it.qty) || 0,
        sellingPrice: Number(it.sellingPrice) || 0,
        costPrice: Number(it.costPrice) || 0,
      })),
      discount: Number(form.discount) || 0,
      paymentMode: form.paymentMode,
      status: form.status,
      notes: form.notes,
    };
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/sales/${editing._id}` : '/api/sales';
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
      const productNames = (r.items || []).map((it) => it.productName).join(' ');
      if (q && !`${r.orderId} ${r.customerName} ${productNames}`.toLowerCase().includes(q)) return false;
      if (filterPayment !== 'All' && r.paymentMode !== filterPayment) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      function val(r) {
        if (sortKey === 'total') return orderTotal(r);
        if (sortKey === 'orderDate') return new Date(r.orderDate).getTime();
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
        <h1 className="text-2xl font-semibold text-[#E8B563]">Sales</h1>
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
            + Add Sale
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
            placeholder={'Search by order ID, customer, product\u2026'}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-3">
          <Dropdown
            className="flex-1"
            value={filterPayment}
            onChange={(v) => { setFilterPayment(v); setPage(1); }}
            options={[{ value: 'All', label: 'Payment: All' }, ...PAYMENT_MODES.map((p) => ({ value: p, label: p }))]}
          />
          <Dropdown
            className="flex-1"
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
            options={[{ value: 'All', label: 'Status: All' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">{'Loading\u2026'}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-glacier">No orders match your filters.</p>
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
                <th className="cursor-pointer select-none" onClick={() => toggleSort('orderDate')}>Date<SortArrow column="orderDate" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('customerName')}>Customer<SortArrow column="customerName" /></th>
                <th>Product</th>
                <th>Size</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('total')}>Total<SortArrow column="total" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('paymentMode')}>Payment<SortArrow column="paymentMode" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status<SortArrow column="status" /></th>
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
                  <td>{row.orderId}</td>
                  <td>{row.orderDate ? new Date(row.orderDate).toLocaleDateString('en-IN') : '\u2014'}</td>
                  <td>{row.customerName}</td>
                  <td>
                    {(row.items || []).map((it, i) => (
                      <div key={i} className="text-xs">{it.productName}</div>
                    ))}
                  </td>
                  <td>
                    {(row.items || []).map((it, i) => (
                      <div key={i} className="text-xs">{it.size} {'\u00D7'} {it.qty}</div>
                    ))}
                  </td>
                  <td>{'\u20B9'}{orderTotal(row)}</td>
                  <td>{row.paymentMode}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${STATUS_STYLE[row.status] || 'bg-gray-500/15 text-gray-400'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {row.status}
                    </span>
                  </td>
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
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between pt-4 text-xs text-glacier">
            <span>{selectedIds.length} selected</span>
            <span>
              Showing {(currentPage - 1) * pageSize + 1}{'\u2013'}{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} orders
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
            className="bg-[#131215] border border-[#E8B563]/30 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-[#F2F1EE] shadow-[0_0_60px_rgba(232,181,99,0.08)]"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[#E8B563]/40 flex items-center justify-center text-[#E8B563]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Sale</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this order.' : 'Create a new sales order.'}</p>
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
                  onChange={(e) => updateOrderField('orderId', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Order Date</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="date"
                  value={form.orderDate}
                  required
                  onChange={(e) => updateOrderField('orderDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Customer</label>
                <Dropdown
                  value={form.customer}
                  onChange={updateCustomer}
                  options={[{ value: '', label: 'Select customer' }, ...customers.map((c) => ({ value: c._id, label: c.name }))]}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Customer Name (display)</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.customerName}
                  onChange={(e) => updateOrderField('customerName', e.target.value)}
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-[#E8B563]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
                  Products
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-[#E8B563]/40 text-[#E8B563] hover:bg-[#E8B563]/10"
                  onClick={addItemRow}
                >
                  + Add Product
                </button>
              </div>
              <div className="space-y-4">
                {form.items.map((item, index) => {
                  const design = designs.find((d) => d.key === item.designKey);
                  return (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end border-b border-white/10 pb-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Product</label>
                        <Dropdown
                          value={item.designKey}
                          onChange={(v) => updateItemDesign(index, v)}
                          options={[{ value: '', label: 'Select product' }, ...designs.map((d) => ({ value: d.key, label: `${d.name} \u2014 ${d.colour}` }))]}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Size</label>
                        <Dropdown
                          value={item.size}
                          onChange={(v) => updateItemSize(index, v)}
                          options={[{ value: '', label: 'Select' }, ...((design ? design.variants : []).map((v) => ({ value: v.size, label: v.size })))]}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Qty</label>
                        <input
                          className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItemField(index, 'qty', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Price</label>
                        <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                          <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                          <input
                            className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                            type="number"
                            value={item.sellingPrice}
                            onChange={(e) => updateItemField(index, 'sellingPrice', Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Cost</label>
                          <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                            <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                            <input
                              className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                              type="number"
                              value={item.costPrice}
                              onChange={(e) => updateItemField(index, 'costPrice', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-red-400 pb-3"
                            onClick={() => removeItemRow(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">{'Discount (\u20B9)'}</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={form.discount}
                    onChange={(e) => updateOrderField('discount', Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Payment Mode</label>
                <Dropdown
                  value={form.paymentMode}
                  onChange={(v) => updateOrderField('paymentMode', v)}
                  options={PAYMENT_MODES.map((v) => ({ value: v, label: v }))}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Status</label>
                <Dropdown
                  value={form.status}
                  onChange={(v) => updateOrderField('status', v)}
                  options={STATUSES.map((v) => ({ value: v, label: v }))}
                />
              </div>
              <div className="flex items-end">
                <p className="text-sm font-semibold text-[#E8B563]">Order Total: {'\u20B9'}{netTotal}</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Notes</label>
              <textarea
                className="input bg-black/30 border-white/10 text-[#F2F1EE] placeholder:text-glacier"
                rows={3}
                value={form.notes}
                onChange={(e) => updateOrderField('notes', e.target.value)}
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
