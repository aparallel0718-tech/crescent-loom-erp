'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Dropdown from '../../../components/Dropdown';

const STATUSES = ['Ordered', 'Received', 'Partially Received', 'Cancelled'];
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];
const STATUS_STYLE = {
  Ordered: 'bg-amber-500/15 text-amber-400',
  Received: 'bg-emerald-500/15 text-emerald-400',
  'Partially Received': 'bg-blue-500/15 text-blue-400',
  Cancelled: 'bg-red-500/15 text-red-400',
};
const ITEMS_PER_PAGE = 10;

// Groups product variants (e.g. COASTAL BLUE - XL / L / M) into one "design"
// using the SKU with the size segment stripped off, e.g. CL-PL-CB-XL -> CL-PL-CB
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

function emptyLine() {
  return { designKey: '', costPerUnit: 0, qtyBySize: {} };
}

function emptyOrder() {
  return {
    poNumber: '',
    supplier: '',
    supplierName: '',
    date: new Date().toISOString().slice(0, 10),
    lines: [emptyLine()],
    status: 'Ordered',
    notes: '',
  };
}

function rowQty(row) {
  return (row.items || []).reduce((s, it) => s + (it.qty || 0), 0);
}

function rowCost(row) {
  return (row.items || []).reduce((s, it) => s + (it.qty || 0) * (it.costPerUnit || 0), 0);
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
  const header = ['PO #', 'Supplier', 'Date', 'Total Qty', 'Total Cost', 'Status'];
  const lines = rows.map((r) => [
    r.poNumber,
    r.supplierName,
    r.date ? new Date(r.date).toLocaleDateString('en-IN') : '',
    rowQty(r),
    rowCost(r),
    r.status,
  ]);
  const csv = [header, ...lines].map((line) => line.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
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

export default function PurchasesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOrder());
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedId, setExpandedId] = useState(null);
  const [itemsPage, setItemsPage] = useState(1);

  const designs = groupByDesign(products);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/purchases');
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
    fetch('/api/suppliers').then((r) => r.json()).then(setSuppliers).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyOrder());
    setShowForm(true);
  }

  // Reconstruct design lines from saved flat items (group items back by design key using sku prefix)
  function openEdit(row) {
    setEditing(row);
    const lines = [];
    const bySku = {};
    products.forEach((p) => (bySku[p._id] = p));
    (row.items || []).forEach((it) => {
      const p = bySku[it.product];
      const parts = p ? (p.sku || '').split('-') : [];
      const designKey = p ? (parts.length > 1 ? parts.slice(0, -1).join('-') : p.sku) : it.productName;
      let line = lines.find((l) => l.designKey === designKey);
      if (!line) {
        line = { designKey, costPerUnit: it.costPerUnit || 0, qtyBySize: {} };
        lines.push(line);
      }
      line.qtyBySize[it.size || 'NA'] = it.qty || 0;
    });
    setForm({
      poNumber: row.poNumber || '',
      supplier: row.supplier || '',
      supplierName: row.supplierName || '',
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
      lines: lines.length ? lines : [emptyLine()],
      status: row.status || 'Ordered',
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this purchase order?')) return;
    const res = await fetch(`/api/purchases/${row._id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error || 'Delete failed');
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
    setItemsPage(1);
  }

  function updateOrderField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSupplier(value) {
    const s = suppliers.find((su) => su._id === value);
    setForm((prev) => ({ ...prev, supplier: value, supplierName: s ? s.name : prev.supplierName }));
  }

  function updateLine(index, key, value) {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [key]: value };
      if (key === 'designKey') {
        lines[index].qtyBySize = {};
      }
      return { ...prev, lines };
    });
  }

  function updateLineQty(index, size, value) {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = {
        ...lines[index],
        qtyBySize: { ...lines[index].qtyBySize, [size]: Number(value) || 0 },
      };
      return { ...prev, lines };
    });
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  }

  function removeLine(index) {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  }

  // Flatten design lines back into individual product/size items for saving
  function buildItemsPayload() {
    const items = [];
    for (const line of form.lines) {
      const design = designs.find((d) => d.key === line.designKey);
      if (!design) continue;
      for (const variant of design.variants) {
        const qty = line.qtyBySize[variant.size] || 0;
        if (qty > 0) {
          items.push({
            product: variant._id,
            productName: `${variant.name} — ${variant.colour} — ${variant.size}`,
            size: variant.size,
            qty,
            costPerUnit: Number(line.costPerUnit) || 0,
          });
        }
      }
    }
    return items;
  }

  const grandTotalQty = form.lines.reduce(
    (sum, l) => sum + Object.values(l.qtyBySize).reduce((s, q) => s + (Number(q) || 0), 0),
    0
  );
  const grandTotalCost = form.lines.reduce((sum, l) => {
    const lineQty = Object.values(l.qtyBySize).reduce((s, q) => s + (Number(q) || 0), 0);
    return sum + lineQty * (Number(l.costPerUnit) || 0);
  }, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const items = buildItemsPayload();
    if (items.length === 0) {
      setError('Add at least one product with a quantity greater than 0.');
      return;
    }
    setSaving(true);
    const payload = {
      poNumber: form.poNumber,
      supplier: form.supplier,
      supplierName: form.supplierName,
      date: form.date,
      items,
      status: form.status,
      notes: form.notes,
    };
    try {
      const method = editing ? 'PATCH' : 'POST';
      const url = editing ? `/api/purchases/${editing._id}` : '/api/purchases';
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

  // --- Dashboard stats (reflect all orders, independent of the table filters) ---
  const totalPurchases = rows.length;
  const totalQuantityAll = rows.reduce((s, r) => s + rowQty(r), 0);
  const now = new Date();
  const totalSpendThisMonth = rows
    .filter((r) => r.date && new Date(r.date).getMonth() === now.getMonth() && new Date(r.date).getFullYear() === now.getFullYear())
    .reduce((s, r) => s + rowCost(r), 0);
  const activeSuppliers = new Set(rows.map((r) => r.supplierName).filter(Boolean)).size;

  const supplierOptions = useMemo(() => {
    const names = new Set(suppliers.map((s) => s.name));
    rows.forEach((r) => r.supplierName && names.add(r.supplierName));
    return Array.from(names);
  }, [suppliers, rows]);

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const productNames = (r.items || []).map((it) => it.productName).join(' ');
      if (q && !`${r.poNumber} ${r.supplierName} ${productNames}`.toLowerCase().includes(q)) return false;
      if (filterSupplier !== 'All' && r.supplierName !== filterSupplier) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      if (!inDateRange(r.date, filterDateRange)) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a.date ? new Date(a.date).getTime() : 0;
      const bv = b.date ? new Date(b.date).getTime() : 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8B563]">Purchases</h1>
          <p className="text-sm text-glacier mt-1">Manage your purchase orders, suppliers and inventory procurement.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden md:block text-sm italic text-[#E8B563]/80 text-right max-w-[220px]">
            “Better procurement<br />for a stronger tomorrow.”
          </p>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openCreate}
          >
            + Add Purchase
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>}
          value={totalPurchases}
          sub="Purchase Orders"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>}
          value={totalQuantityAll}
          sub="Items Purchased"
        />
        <StatCard
          icon={<span className="text-lg font-semibold">{'\u20B9'}</span>}
          value={`\u20B9${totalSpendThisMonth.toLocaleString('en-IN')}`}
          sub="This Month"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17h1v-5l2-5h9l2 5h3v5h-2" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></svg>}
          value={activeSuppliers}
          sub="Suppliers"
        />
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card mb-4 relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-full px-4 py-3 text-sm text-glacier flex-1 min-w-[220px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              className="bg-transparent outline-none w-full text-[#F2F1EE] placeholder:text-glacier"
              placeholder={'Search by PO number, supplier or product\u2026'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Dropdown
              value={filterDateRange}
              onChange={setFilterDateRange}
              options={DATE_RANGES}
            />
            <Dropdown
              value={filterSupplier}
              onChange={setFilterSupplier}
              options={[{ value: 'All', label: 'All Suppliers' }, ...supplierOptions.map((s) => ({ value: s, label: s }))]}
            />
            <Dropdown
              value={filterStatus}
              onChange={setFilterStatus}
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
          <p className="text-sm text-glacier">No purchase orders match your filters.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th></th>
                <th>PO #</th>
                <th>Supplier</th>
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
                <th>Products</th>
                <th>Total Qty</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const totalQty = rowQty(row);
                const totalCost = rowCost(row);
                const items = row.items || [];
                const expanded = expandedId === row._id;
                const totalItemPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
                const curItemsPage = Math.min(itemsPage, totalItemPages);
                const pageItems = items.slice((curItemsPage - 1) * ITEMS_PER_PAGE, curItemsPage * ITEMS_PER_PAGE);
                const leftItems = pageItems.slice(0, 5);
                const rightItems = pageItems.slice(5, 10);
                const startIndex = (curItemsPage - 1) * ITEMS_PER_PAGE;

                return (
                  <Fragment key={row._id}>
                    <tr>
                      <td>
                        <button
                          type="button"
                          className="text-glacier hover:text-[#F2F1EE]"
                          onClick={() => toggleExpand(row._id)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={expanded ? 'rotate-180' : ''}>
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </td>
                      <td>{row.poNumber}</td>
                      <td>{row.supplierName}</td>
                      <td>{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '\u2014'}</td>
                      <td>
                        <button type="button" className="text-left" onClick={() => toggleExpand(row._id)}>
                          <p className="text-sm text-[#F2F1EE]">{items.length} products</p>
                          <p className="text-[11px] text-glacier">Click to view all items</p>
                        </button>
                      </td>
                      <td>{totalQty}</td>
                      <td>{'\u20B9'}{totalCost.toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${STATUS_STYLE[row.status] || 'bg-gray-500/15 text-gray-400'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE] hover:bg-white/5"
                            onClick={() => toggleExpand(row._id)}
                            title="View items"
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
                    {expanded && (
                      <tr>
                        <td colSpan={9} className="bg-black/20">
                          <div className="p-4">
                            <div className="flex items-center gap-2 mb-3 text-[#E8B563]">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
                              <span className="text-sm font-semibold">Products in this Purchase Order ({items.length} items)</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                              <div>
                                <div className="grid grid-cols-[2rem_1fr_3rem] gap-2 text-glacier uppercase text-[10px] tracking-wide pb-1 border-b border-white/10">
                                  <span>#</span><span>Product Name</span><span>Qty</span>
                                </div>
                                {leftItems.map((it, i) => (
                                  <div key={i} className="grid grid-cols-[2rem_1fr_3rem] gap-2 py-1.5 border-b border-white/5 text-[#F2F1EE]">
                                    <span className="text-glacier">{startIndex + i + 1}</span>
                                    <span>{it.productName}</span>
                                    <span>{it.qty}</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <div className="grid grid-cols-[2rem_1fr_3rem] gap-2 text-glacier uppercase text-[10px] tracking-wide pb-1 border-b border-white/10">
                                  <span>#</span><span>Product Name</span><span>Qty</span>
                                </div>
                                {rightItems.map((it, i) => (
                                  <div key={i} className="grid grid-cols-[2rem_1fr_3rem] gap-2 py-1.5 border-b border-white/5 text-[#F2F1EE]">
                                    <span className="text-glacier">{startIndex + 5 + i + 1}</span>
                                    <span>{it.productName}</span>
                                    <span>{it.qty}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 text-xs text-glacier">
                              <span>
                                Showing {Math.min(pageItems.length, items.length)} of {items.length} items
                              </span>
                              {totalItemPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <button
                                    className="w-7 h-7 rounded-full border border-white/10 disabled:opacity-30"
                                    disabled={curItemsPage === 1}
                                    onClick={() => setItemsPage((p) => p - 1)}
                                  >
                                    {'\u2039'}
                                  </button>
                                  {Array.from({ length: totalItemPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                      key={p}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                                        p === curItemsPage ? 'bg-gold text-black' : 'border border-white/10 text-glacier'
                                      }`}
                                      onClick={() => setItemsPage(p)}
                                    >
                                      {p}
                                    </button>
                                  ))}
                                  <button
                                    className="w-7 h-7 rounded-full border border-white/10 disabled:opacity-30"
                                    disabled={curItemsPage === totalItemPages}
                                    onClick={() => setItemsPage((p) => p + 1)}
                                  >
                                    {'\u203A'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-[#131215] border border-[#E8B563]/30 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto text-[#F2F1EE] shadow-[0_0_60px_rgba(232,181,99,0.08)]"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-[#E8B563]/40 flex items-center justify-center text-[#E8B563]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Purchase</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this purchase order.' : 'Create a new purchase order.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Purchase Order #</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.poNumber}
                  required
                  onChange={(e) => updateOrderField('poNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Supplier</label>
                <Dropdown
                  value={form.supplier}
                  onChange={updateSupplier}
                  options={[{ value: '', label: 'Select supplier' }, ...suppliers.map((s) => ({ value: s._id, label: s.name }))]}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Supplier Name (display)</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  value={form.supplierName}
                  onChange={(e) => updateOrderField('supplierName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Date</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="date"
                  value={form.date}
                  required
                  onChange={(e) => updateOrderField('date', e.target.value)}
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
                  onClick={addLine}
                >
                  + Add Product
                </button>
              </div>
              <div className="space-y-4">
                {form.lines.map((line, index) => {
                  const design = designs.find((d) => d.key === line.designKey);
                  const lineQty = Object.values(line.qtyBySize).reduce((s, q) => s + (Number(q) || 0), 0);
                  return (
                    <div key={index} className="border border-white/10 rounded-xl p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Design</label>
                          <Dropdown
                            value={line.designKey}
                            onChange={(v) => updateLine(index, 'designKey', v)}
                            options={[{ value: '', label: 'Select design' }, ...designs.map((d) => ({ value: d.key, label: `${d.name} \u2014 ${d.colour}` }))]}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Cost per Unit</label>
                          <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                            <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                            <input
                              className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                              type="number"
                              value={line.costPerUnit}
                              onChange={(e) => updateLine(index, 'costPerUnit', Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>

                      {design && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                          {design.variants.map((v) => (
                            <div key={v._id}>
                              <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">{v.size || 'Size'}</label>
                              <input
                                className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                                type="number"
                                min="0"
                                value={line.qtyBySize[v.size] || ''}
                                onChange={(e) => updateLineQty(index, v.size, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-glacier">Line total qty: {lineQty}</p>
                        {form.lines.length > 1 && (
                          <button type="button" className="text-xs text-red-400" onClick={() => removeLine(index)}>
                            Remove product
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
                <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Status</label>
                <Dropdown
                  value={form.status}
                  onChange={(v) => updateOrderField('status', v)}
                  options={STATUSES.map((v) => ({ value: v, label: v }))}
                />
              </div>
              <div className="flex items-end gap-4">
                <p className="text-sm font-semibold text-[#E8B563]">Total Qty: {grandTotalQty}</p>
                <p className="text-sm font-semibold text-[#E8B563]">Total Cost: {'\u20B9'}{grandTotalCost}</p>
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
