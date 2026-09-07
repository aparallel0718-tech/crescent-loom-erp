'use client';
import { useEffect, useState } from 'react';
import Dropdown from '../../../components/Dropdown';
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function slugifySku(name) {
  return (name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function emptyDesign() {
  return {
    name: '',
    category: '',
    productCollection: '',
    colour: '',
    material: '',
    sellingPrice: 0,
    mrp: 0,
    discountPct: 0,
    costTemplate: '',
    costPrice: 0,
    reorderLevel: 5,
    status: 'active',
    notes: '',
    qtyBySize: {},
  };
}

function emptyEditForm() {
  return {
    name: '',
    sku: '',
    category: '',
    productCollection: '',
    size: '',
    colour: '',
    material: '',
    sellingPrice: 0,
    mrp: 0,
    discountPct: 0,
    costTemplate: '',
    costPrice: 0,
    costTemplateAppliedTotal: null,
    reorderLevel: 5,
    status: 'active',
    notes: '',
  };
}

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [designForm, setDesignForm] = useState(emptyDesign());
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSize, setFilterSize] = useState('All');
  const [filterColour, setFilterColour] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 15;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      setRows(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/cost-templates');
      if (res.ok) setTemplates(await res.json());
    } catch {
      // non-fatal
    }
  }

  useEffect(() => {
    load();
    loadTemplates();
  }, []);

  function templateTotal(tpl) {
    if (!tpl) return 0;
    return tpl.totalCost ?? (tpl.lines || []).reduce((s, l) => s + (l.cost || 0), 0);
  }

  function openAdd() {
    setDesignForm(emptyDesign());
    setShowAdd(true);
  }

  function updateDesignField(key, value) {
    setDesignForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateDesignTemplate(templateId) {
    const tpl = templates.find((t) => t._id === templateId);
    setDesignForm((prev) => ({
      ...prev,
      costTemplate: templateId,
      costPrice: tpl ? templateTotal(tpl) : prev.costPrice,
    }));
  }

  function updateDesignCollection(value) {
    setDesignForm((prev) => {
      const match = templates.find((t) => t.name.trim().toLowerCase() === value.trim().toLowerCase());
      return {
        ...prev,
        productCollection: value,
        costTemplate: match ? match._id : prev.costTemplate,
        costPrice: match ? templateTotal(match) : prev.costPrice,
      };
    });
  }

  function updateDesignQty(size, value) {
    setDesignForm((prev) => ({ ...prev, qtyBySize: { ...prev.qtyBySize, [size]: Number(value) || 0 } }));
  }

  const totalTshirts = SIZES.reduce((sum, s) => sum + (designForm.qtyBySize[s] || 0), 0);

  async function handleAddSubmit(e) {
    e.preventDefault();
    setError('');
    const activeSizes = SIZES.filter((s) => (designForm.qtyBySize[s] || 0) > 0);
    if (activeSizes.length === 0) {
      setError('Enter a quantity for at least one size.');
      return;
    }
    const baseSku = slugifySku(designForm.name);
    if (!baseSku) {
      setError('Product Name is required.');
      return;
    }
    setSaving(true);
    try {
      for (const size of activeSizes) {
        const sku = `${baseSku}-${size}`;
        const productRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: designForm.name,
            sku,
            category: designForm.category,
            productCollection: designForm.productCollection,
            size,
            colour: designForm.colour,
            material: designForm.material,
            sellingPrice: Number(designForm.sellingPrice) || 0,
            mrp: Number(designForm.mrp) || 0,
            discountPct: Number(designForm.discountPct) || 0,
            costTemplate: designForm.costTemplate || undefined,
            costPrice: Number(designForm.costPrice) || 0,
            costTemplateAppliedTotal: designForm.costTemplate ? Number(designForm.costPrice) || 0 : undefined,
            reorderLevel: Number(designForm.reorderLevel) || 0,
            status: designForm.status,
            notes: designForm.notes,
          }),
        });
        if (!productRes.ok) {
          const err = await productRes.json();
          throw new Error(`${sku}: ${err.error || 'Failed to create product'}`);
        }
        const product = await productRes.json();

        const qty = designForm.qtyBySize[size] || 0;
        const invRes = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: product._id,
            sku,
            opening: qty,
            purchased: 0,
            sold: 0,
            returned: 0,
            exchanged: 0,
            damaged: 0,
            consumables: 0,
            warehouse: 'Main',
            period: currentPeriod(),
          }),
        });
        if (!invRes.ok) {
          const err = await invRes.json();
          throw new Error(`${sku}: product created, but inventory entry failed — ${err.error || 'unknown error'}`);
        }
      }
      setShowAdd(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row) {
    setEditing(row);
    setEditForm({
      name: row.name || '',
      sku: row.sku || '',
      category: row.category || '',
      productCollection: row.productCollection || '',
      size: row.size || '',
      colour: row.colour || '',
      material: row.material || '',
      sellingPrice: row.sellingPrice || 0,
      mrp: row.mrp || 0,
      discountPct: row.discountPct || 0,
      costTemplate: row.costTemplate || '',
      costPrice: row.costPrice || 0,
      costTemplateAppliedTotal: row.costTemplateAppliedTotal ?? null,
      reorderLevel: row.reorderLevel || 0,
      status: row.status || 'active',
      notes: row.notes || '',
    });
    setShowEdit(true);
  }

  function updateEditField(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditTemplate(templateId) {
    const tpl = templates.find((t) => t._id === templateId);
    setEditForm((prev) => ({
      ...prev,
      costTemplate: templateId,
      costPrice: tpl ? templateTotal(tpl) : prev.costPrice,
      costTemplateAppliedTotal: tpl ? templateTotal(tpl) : prev.costTemplateAppliedTotal,
    }));
  }

  function recalcFromTemplate() {
    const tpl = templates.find((t) => t._id === editForm.costTemplate);
    if (!tpl) return;
    const newTotal = templateTotal(tpl);
    setEditForm((prev) => ({ ...prev, costPrice: newTotal, costTemplateAppliedTotal: newTotal }));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/products/${editing._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        costTemplate: editForm.costTemplate || undefined,
      }),
    });
    if (res.ok) {
      setShowEdit(false);
      load();
    } else {
      setError((await res.json()).error || 'Save failed');
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete ${row.name} (${row.sku})?`)) return;
    const res = await fetch(`/api/products/${row._id}`, { method: 'DELETE' });
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
    if (!confirm(`Delete ${selectedIds.length} selected product(s)? This cannot be undone.`)) return;
    setError('');
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Failed to delete one item`);
        }
      }
      setSelectedIds([]);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function quickRecalc(row) {
    const tpl = templates.find((t) => t._id === row.costTemplate);
    if (!tpl) return;
    const newTotal = templateTotal(tpl);
    const res = await fetch(`/api/products/${row._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costPrice: newTotal, costTemplateAppliedTotal: newTotal }),
    });
    if (res.ok) load();
    else setError((await res.json()).error || 'Recalculate failed');
  }

    const designCategories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  const designColours = [...new Set(rows.map((r) => r.colour).filter(Boolean))];
  const designCollections = [...new Set(rows.map((r) => r.productCollection).filter(Boolean))];
  const designMaterials = [...new Set(rows.map((r) => r.material).filter(Boolean))];

  const filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (q && !`${r.name} ${r.sku} ${r.category}`.toLowerCase().includes(q)) return false;
      if (filterCategory !== 'All' && r.category !== filterCategory) return false;
      if (filterSize !== 'All' && r.size !== filterSize) return false;
      if (filterColour !== 'All' && r.colour !== filterColour) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus.toLowerCase()) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
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
    if (sortKey !== column) return <span className="text-glacier/40 ml-1">↕</span>;
    return <span className="text-gold ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#F2F1EE]">Products &amp; Styles</h1>
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
            placeholder="Search by name, SKU, category…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
                <div className="flex items-center gap-3">
          <Dropdown
            className="flex-1"
            value={filterCategory}
            onChange={(v) => { setFilterCategory(v); setPage(1); }}
            options={categories.map((c) => ({ value: c, label: c === 'All' ? 'Category: All' : c }))}
          />
          <Dropdown
            className="flex-1"
            value={filterSize}
            onChange={(v) => { setFilterSize(v); setPage(1); }}
            options={sizes.map((s) => ({ value: s, label: s === 'All' ? 'Size: All' : s }))}
          />
          <Dropdown
            className="flex-1"
            value={filterColour}
            onChange={(v) => { setFilterColour(v); setPage(1); }}
            options={colours.map((c) => ({ value: c, label: c === 'All' ? 'Colour: All' : c }))}
          />
          <Dropdown
            className="flex-1"
            value={filterStatus}
            onChange={(v) => { setFilterStatus(v); setPage(1); }}
            options={[
              { value: 'All', label: 'Status: All' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openAdd}
          >
            + Add Product
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-glacier">No products match your filters.</p>
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
                <th className="cursor-pointer select-none" onClick={() => toggleSort('sku')}>SKU<SortArrow column="sku" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('category')}>Category<SortArrow column="category" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('size')}>Size<SortArrow column="size" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('colour')}>Colour<SortArrow column="colour" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('sellingPrice')}>Selling Price<SortArrow column="sellingPrice" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('costPrice')}>Cost<SortArrow column="costPrice" /></th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>Status<SortArrow column="status" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const tpl = templates.find((t) => t._id === row.costTemplate);
                const currentTplTotal = tpl ? templateTotal(tpl) : null;
                const isStale =
                  tpl && row.costTemplateAppliedTotal != null && currentTplTotal !== row.costTemplateAppliedTotal;
                return (
                  <tr key={row._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row._id)}
                        onChange={() => toggleSelect(row._id)}
                      />
                    </td>
                    <td className="flex items-center gap-2 py-2">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                        style={{ background: row.colour ? row.colour.toLowerCase().replace(/\s+/g, '') : '#666' }}
                      />
                      {row.name}
                    </td>
                    <td>{row.sku}</td>
                    <td>{row.category}</td>
                    <td>{row.size}</td>
                    <td>{row.colour}</td>
                    <td>₹{row.sellingPrice}</td>
                    <td>
                      ₹{row.costPrice}
                      {isStale && (
                        <div className="text-xs text-amber-400 mt-1">
                          Template changed: ₹{row.costTemplateAppliedTotal} → ₹{currentTplTotal}{' '}
                          <button type="button" className="underline" onClick={() => quickRecalc(row)}>
                            Update
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
                        row.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                        {row.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="relative text-right">
                      <button
                        className="text-glacier hover:text-[#F2F1EE] px-2"
                        onClick={() => setOpenMenuId(openMenuId === row._id ? null : row._id)}
                      >
                        •••
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
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} products
            </span>
            <div className="flex items-center gap-2">
              <button
                className="w-7 h-7 rounded-full border border-white/10 disabled:opacity-30"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="w-6 h-6 rounded-full bg-gold text-black flex items-center justify-center text-[11px] font-semibold">
                {currentPage}
              </span>
              <button
                className="w-7 h-7 rounded-full border border-white/10 disabled:opacity-30"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          </div>
          </>
        )}
      </div>

            {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-[#131215] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto text-[#F2F1EE]"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8B563] to-[#8a6a2f] flex items-center justify-center text-black">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Add Design</h2>
                  <p className="text-xs text-glacier">Add a new product design to your catalog.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAdd(false)} className="text-glacier hover:text-[#F2F1EE] text-lg leading-none">
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs mb-1 text-glacier">Product Name</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE] placeholder:text-glacier"
                  value={designForm.name}
                  required
                  onChange={(e) => updateDesignField('name', e.target.value)}
                  placeholder="e.g. Charcoal Black"
                />
                {designForm.name && (
                  <p className="text-xs text-glacier mt-1">
                    SKU base: {slugifySku(designForm.name)} (e.g. {slugifySku(designForm.name)}-S)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Category</label>
                <Dropdown
                  value={designForm.category}
                  onChange={(v) => updateDesignField('category', v)}
                  options={[{ value: '', label: 'Select category' }, ...designCategories.map((c) => ({ value: c, label: c }))]}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Collection</label>
                <Dropdown
                  value={designForm.productCollection}
                  onChange={(v) => updateDesignCollection(v)}
                  options={[{ value: '', label: 'Select collection' }, ...designCollections.map((c) => ({ value: c, label: c }))]}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Colour</label>
                <Dropdown
                  value={designForm.colour}
                  onChange={(v) => updateDesignField('colour', v)}
                  options={[{ value: '', label: 'Select colour' }, ...designColours.map((c) => ({ value: c, label: c }))]}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Material</label>
                <Dropdown
                  value={designForm.material}
                  onChange={(v) => updateDesignField('material', v)}
                  options={[{ value: '', label: 'Select material' }, ...designMaterials.map((m) => ({ value: m, label: m }))]}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Selling Price</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">₹</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={designForm.sellingPrice}
                    onChange={(e) => updateDesignField('sellingPrice', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">MRP</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">₹</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={designForm.mrp}
                    onChange={(e) => updateDesignField('mrp', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Discount %</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={designForm.discountPct}
                    onChange={(e) => updateDesignField('discountPct', e.target.value)}
                  />
                  <span className="text-glacier text-sm ml-1">%</span>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Cost Template</label>
                <Dropdown
                  value={designForm.costTemplate}
                  onChange={(v) => updateDesignTemplate(v)}
                  options={[
                    { value: '', label: 'None (enter manually)' },
                    ...templates.map((t) => ({ value: t._id, label: `${t.name} — ₹${templateTotal(t)}` })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Costing (from template, editable)</label>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                  <span className="text-glacier text-sm mr-1">₹</span>
                  <input
                    className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                    type="number"
                    value={designForm.costPrice}
                    onChange={(e) => updateDesignField('costPrice', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Reorder Level</label>
                <input
                  className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                  type="number"
                  value={designForm.reorderLevel}
                  onChange={(e) => updateDesignField('reorderLevel', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Status</label>
                <Dropdown
                  value={designForm.status}
                  onChange={(v) => updateDesignField('status', v)}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#E8B563]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></svg>
                  Sizes &amp; Opening Stock Quantity
                </label>
                <span className="text-xs font-semibold text-[#E8B563]">Total T-Shirts: {totalTshirts}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SIZES.map((s) => (
                  <div key={s}>
                    <label className="block text-xs mb-1 text-glacier">{s}</label>
                    <input
                      className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                      type="number"
                      min="0"
                      value={designForm.qtyBySize[s] || ''}
                      onChange={(e) => updateDesignQty(s, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1 text-glacier">Notes</label>
              <textarea
                className="input bg-black/30 border-white/10 text-[#F2F1EE] placeholder:text-glacier"
                rows={3}
                placeholder="Add any additional notes here…"
                value={designForm.notes}
                onChange={(e) => updateDesignField('notes', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-[#F2F1EE] hover:bg-white/5"
                onClick={() => setShowAdd(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)]"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleEditSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">Edit Product</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1 text-glacier">Product Name</label>
                <input className="input" value={editForm.name} required onChange={(e) => updateEditField('name', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">SKU</label>
                <input className="input" value={editForm.sku} required onChange={(e) => updateEditField('sku', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Category</label>
                <input className="input" value={editForm.category} onChange={(e) => updateEditField('category', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Collection</label>
                <input className="input" value={editForm.productCollection} onChange={(e) => updateEditField('productCollection', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Size</label>
                <input className="input" value={editForm.size} onChange={(e) => updateEditField('size', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Colour</label>
                <input className="input" value={editForm.colour} onChange={(e) => updateEditField('colour', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Material</label>
                <input className="input" value={editForm.material} onChange={(e) => updateEditField('material', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Selling Price</label>
                <input className="input" type="number" value={editForm.sellingPrice} onChange={(e) => updateEditField('sellingPrice', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">MRP</label>
                <input className="input" type="number" value={editForm.mrp} onChange={(e) => updateEditField('mrp', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Discount %</label>
                <input className="input" type="number" value={editForm.discountPct} onChange={(e) => updateEditField('discountPct', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Cost Template</label>
                <select className="input" value={editForm.costTemplate} onChange={(e) => updateEditTemplate(e.target.value)}>
                  <option value="">None</option>
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} — ₹{templateTotal(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Costing</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    type="number"
                    value={editForm.costPrice}
                    onChange={(e) => updateEditField('costPrice', Number(e.target.value))}
                  />
                  {editForm.costTemplate && (
                    <button type="button" className="btn-secondary text-xs whitespace-nowrap" onClick={recalcFromTemplate}>
                      Recalc
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Reorder Level</label>
                <input className="input" type="number" value={editForm.reorderLevel} onChange={(e) => updateEditField('reorderLevel', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Status</label>
                <select className="input" value={editForm.status} onChange={(e) => updateEditField('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs mb-1 text-glacier">Notes</label>
              <textarea className="input" rows={3} value={editForm.notes} onChange={(e) => updateEditField('notes', e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}