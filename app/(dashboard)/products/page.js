'use client';
import { useEffect, useState } from 'react';

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
    costPrice: 0,
    reorderLevel: 5,
    status: 'active',
    notes: '',
  };
}

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [designForm, setDesignForm] = useState(emptyDesign());
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm());
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setDesignForm(emptyDesign());
    setShowAdd(true);
  }

  function updateDesignField(key, value) {
    setDesignForm((prev) => ({ ...prev, [key]: value }));
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
            costPrice: Number(designForm.costPrice) || 0,
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
      costPrice: row.costPrice || 0,
      reorderLevel: row.reorderLevel || 0,
      status: row.status || 'active',
      notes: row.notes || '',
    });
    setShowEdit(true);
  }

  function updateEditField(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch(`/api/products/${editing._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
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
    if (selectedIds.length === rows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map((r) => r._id));
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Products &amp; Styles</h1>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="text-xs text-red-600 border border-red-300 rounded px-3 py-2 hover:bg-red-50"
              onClick={handleBulkDelete}
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button className="btn-primary" onClick={openAdd}>
            + Add Design
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-glacier">No products yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Collection</th>
                <th>Size</th>
                <th>Colour</th>
                <th>Selling Price</th>
                <th>MRP</th>
                <th>Cost</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row._id)}
                      onChange={() => toggleSelect(row._id)}
                    />
                  </td>
                  <td>{row.name}</td>
                  <td>{row.sku}</td>
                  <td>{row.category}</td>
                  <td>{row.productCollection}</td>
                  <td>{row.size}</td>
                  <td>{row.colour}</td>
                  <td>₹{row.sellingPrice}</td>
                  <td>₹{row.mrp}</td>
                  <td>₹{row.costPrice}</td>
                  <td>{row.status}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="text-xs text-gold mr-3" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button className="text-xs text-red-500" onClick={() => handleDelete(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">Add Design</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="sm:col-span-2">
                <label className="block text-xs mb-1 text-glacier">Product Name</label>
                <input
                  className="input"
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
                <input className="input" value={designForm.category} onChange={(e) => updateDesignField('category', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Collection</label>
                <input className="input" value={designForm.productCollection} onChange={(e) => updateDesignField('productCollection', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Colour</label>
                <input className="input" value={designForm.colour} onChange={(e) => updateDesignField('colour', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Material</label>
                <input className="input" value={designForm.material} onChange={(e) => updateDesignField('material', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Selling Price</label>
                <input className="input" type="number" value={designForm.sellingPrice} onChange={(e) => updateDesignField('sellingPrice', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">MRP</label>
                <input className="input" type="number" value={designForm.mrp} onChange={(e) => updateDesignField('mrp', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Discount %</label>
                <input className="input" type="number" value={designForm.discountPct} onChange={(e) => updateDesignField('discountPct', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Costing</label>
                <input className="input" type="number" value={designForm.costPrice} onChange={(e) => updateDesignField('costPrice', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Reorder Level</label>
                <input className="input" type="number" value={designForm.reorderLevel} onChange={(e) => updateDesignField('reorderLevel', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Status</label>
                <select className="input" value={designForm.status} onChange={(e) => updateDesignField('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Sizes &amp; Opening Stock Quantity</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SIZES.map((s) => (
                  <div key={s}>
                    <label className="block text-xs mb-1 text-glacier">{s}</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={designForm.qtyBySize[s] || ''}
                      onChange={(e) => updateDesignQty(s, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold mt-2">Total T-Shirts: {totalTshirts}</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1 text-glacier">Notes</label>
              <textarea className="input" rows={3} value={designForm.notes} onChange={(e) => updateDesignField('notes', e.target.value)} />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
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
                <label className="block text-xs mb-1 text-glacier">Costing</label>
                <input className="input" type="number" value={editForm.costPrice} onChange={(e) => updateEditField('costPrice', Number(e.target.value))} />
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
