'use client';
import { useEffect, useState } from 'react';

const PAYMENT_MODES = ['Prepaid', 'COD', 'Card', 'UPI', 'Bank Transfer'];
const STATUSES = ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Cancelled'];
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Groups product variants (e.g. GRAPHITE BLACK - XL / L / M) into one "design"
// using the SKU with the size segment stripped off, e.g. CL-PL-GB-XL -> CL-PL-GB
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

export default function SalesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyOrder());

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

  // Reconstruct designKey/size for each saved item using the products list (SKU prefix match)
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
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/sales/${editing._id}` : '/api/sales';
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
        <h1 className="text-2xl font-semibold">Sales</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Add Sale
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-glacier">No orders yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Product</th>
<th>Size</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>{row.orderId}</td>
                  <td>{row.orderDate ? new Date(row.orderDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td>{row.customerName}</td>
                  <td>
  {(row.items || []).map((it, i) => (
    <div key={i} className="text-xs">
      {it.productName}
    </div>
  ))}
</td>
<td>
  {(row.items || []).map((it, i) => (
    <div key={i} className="text-xs">
      {it.size} × {it.qty}
    </div>
  ))}
</td>
                  <td>
                    ₹
                    {(row.items || []).reduce((sum, it) => sum + (it.qty || 0) * (it.sellingPrice || 0), 0) -
                      (row.discount || 0)}
                  </td>
                  <td>{row.paymentMode}</td>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">
              {editing ? 'Edit' : 'Add'} Sale
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs mb-1 text-glacier">Order ID</label>
                <input
                  className="input"
                  value={form.orderId}
                  required
                  onChange={(e) => updateOrderField('orderId', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Order Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.orderDate}
                  required
                  onChange={(e) => updateOrderField('orderDate', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Customer</label>
                <select className="input" value={form.customer} onChange={(e) => updateCustomer(e.target.value)}>
                  <option value="">Select…</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Customer Name (display)</label>
                <input
                  className="input"
                  value={form.customerName}
                  onChange={(e) => updateOrderField('customerName', e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Products</label>
                <button type="button" className="btn-secondary text-xs" onClick={addItemRow}>
                  + Add Product
                </button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const design = designs.find((d) => d.key === item.designKey);
                  return (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end border-b pb-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs mb-1 text-glacier">Product</label>
                        <select
                          className="input"
                          value={item.designKey}
                          onChange={(e) => updateItemDesign(index, e.target.value)}
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
                        <label className="block text-xs mb-1 text-glacier">Size</label>
                        <select
                          className="input"
                          value={item.size}
                          disabled={!design}
                          onChange={(e) => updateItemSize(index, e.target.value)}
                        >
                          <option value="">Select…</option>
                          {design &&
                            design.variants.map((v) => (
                              <option key={v._id} value={v.size}>
                                {v.size}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-glacier">Qty</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItemField(index, 'qty', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-glacier">Price</label>
                        <input
                          className="input"
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) => updateItemField(index, 'sellingPrice', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs mb-1 text-glacier">Cost</label>
                          <input
                            className="input"
                            type="number"
                            value={item.costPrice}
                            onChange={(e) => updateItemField(index, 'costPrice', Number(e.target.value))}
                          />
                        </div>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-red-500 mb-2"
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
                <label className="block text-xs mb-1 text-glacier">Discount (₹)</label>
                <input
                  className="input"
                  type="number"
                  value={form.discount}
                  onChange={(e) => updateOrderField('discount', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-glacier">Payment Mode</label>
                <select
                  className="input"
                  value={form.paymentMode}
                  onChange={(e) => updateOrderField('paymentMode', e.target.value)}
                >
                  {PAYMENT_MODES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="flex items-end">
                <p className="text-sm font-semibold">Order Total: ₹{netTotal}</p>
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
