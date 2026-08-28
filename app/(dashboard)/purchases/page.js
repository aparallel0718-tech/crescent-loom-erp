'use client';
import { useEffect, useState } from 'react';

const STATUSES = ['Ordered', 'Received', 'Partially Received', 'Cancelled'];
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

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

export default function PurchasesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOrder());

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
    const payload = {
      poNumber: form.poNumber,
      supplier: form.supplier,
      supplierName: form.supplierName,
      date: form.date,
      items,
      status: form.status,
      notes: form.notes,
    };
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/purchases/${editing._id}` : '/api/purchases';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    } else {
      setError((await res.json()).error || 'Save failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Purchases</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Add Purchase
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-glacier">No purchase orders yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Products</th>
                <th>Total Qty</th>
                <th>Total Cost</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const totalQty = (row.items || []).reduce((s, it) => s + (it.qty || 0), 0);
                const totalCost = (row.items || []).reduce((s, it) => s + (it.qty || 0) * (it.costPerUnit || 0), 0);
                return (
                  <tr key={row._id}>
                    <td>{row.poNumber}</td>
                    <td>{row.supplierName}</td>
                    <td>{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      {(row.items || []).map((it, i) => (
                        <div key={i} className="text-xs">
                          {it.productName} × {it.qty}
                        </div>
                      ))}
                    </td>
                    <td>{totalQty}</td>
                    <td>₹{totalCost}</td>
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Purchase</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1 text-glacier">Purchase Order #</label>
                <input
                  className="input"
                  value={form.poNumber}
                  required
                  onChange={(e) => updateOrderField('poNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Supplier</label>
                <select className="input" value={form.supplier} onChange={(e) => updateSupplier(e.target.value)}>
                  <option value="">Select…</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Supplier Name (display)</label>
                <input
                  className="input"
                  value={form.supplierName}
                  onChange={(e) => updateOrderField('supplierName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  required
                  onChange={(e) => updateOrderField('date', e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Products</label>
                <button type="button" className="btn-secondary text-xs" onClick={addLine}>
                  + Add Product
                </button>
              </div>
              <div className="space-y-4">
                {form.lines.map((line, index) => {
                  const design = designs.find((d) => d.key === line.designKey);
                  const lineQty = Object.values(line.qtyBySize).reduce((s, q) => s + (Number(q) || 0), 0);
                  return (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs mb-1 text-glacier">Design</label>
                          <select
                            className="input"
                            value={line.designKey}
                            onChange={(e) => updateLine(index, 'designKey', e.target.value)}
                          >
                            <option value="">Select…</option>
                            {designs.map((d) => (
                              <option key={d.key} value={d.key}>
                                {d.name} — {d.colour}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs mb-1 text-glacier">Cost per Unit</label>
                          <input
                            className="input"
                            type="number"
                            value={line.costPerUnit}
                            onChange={(e) => updateLine(index, 'costPerUnit', Number(e.target.value))}
                          />
                        </div>
                      </div>

                      {design && (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
                          {design.variants.map((v) => (
                            <div key={v._id}>
                              <label className="block text-xs mb-1 text-glacier">{v.size || 'Size'}</label>
                              <input
                                className="input"
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
                          <button type="button" className="text-xs text-red-500" onClick={() => removeLine(index)}>
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
                <label className="block text-xs mb-1 text-glacier">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => updateOrderField('status', e.target.value)}
                >
                  {STATUSES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-4">
                <p className="text-sm font-semibold">Total Qty: {grandTotalQty}</p>
                <p className="text-sm font-semibold">Total Cost: ₹{grandTotalCost}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1 text-glacier">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(e) => updateOrderField('notes', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
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
