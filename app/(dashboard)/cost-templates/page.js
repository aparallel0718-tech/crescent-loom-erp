'use client';
import { useEffect, useState } from 'react';

function emptyLine() {
  return { component: '', cost: 0, notes: '' };
}

function emptyTemplate() {
  return { name: '', lines: [emptyLine()], notes: '' };
}

export default function CostTemplatesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTemplate());
  const [pendingApply, setPendingApply] = useState(null); // { template, total, matches }
  const [applying, setApplying] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cost-templates');
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

  function templateTotal(tpl) {
    return tpl.totalCost ?? (tpl.lines || []).reduce((s, l) => s + (l.cost || 0), 0);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyTemplate());
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({
      name: row.name || '',
      lines: row.lines && row.lines.length ? row.lines.map((l) => ({ ...l })) : [emptyLine()],
      notes: row.notes || '',
    });
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm(`Delete template "${row.name}"? Products using it will keep their current cost.`)) return;
    const res = await fetch(`/api/cost-templates/${row._id}`, { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error || 'Delete failed');
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(index, key, value) {
    setForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], [key]: value };
      return { ...prev, lines };
    });
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));
  }

  function removeLine(index) {
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
  }

  const total = form.lines.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/cost-templates/${editing._id}` : '/api/cost-templates';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error || 'Save failed');
      return;
    }
    const saved = await res.json();
    setShowForm(false);

    // Check for existing products in a matching Collection that could use this template's cost
    try {
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const products = await prodRes.json();
        const newTotal = total;
        const matches = products.filter((p) => {
          const collectionMatches =
            (p.productCollection || '').trim().toLowerCase() === saved.name.trim().toLowerCase();
          const alreadyUpToDate = p.costTemplate === saved._id && p.costTemplateAppliedTotal === newTotal;
          return collectionMatches && !alreadyUpToDate;
        });
        if (matches.length > 0) {
          setPendingApply({ template: saved, total: newTotal, matches });
        }
      }
    } catch {
      // non-fatal — skip the review step silently if products couldn't be fetched
    }

    load();
  }

  async function confirmApply() {
    if (!pendingApply) return;
    setApplying(true);
    try {
      for (const p of pendingApply.matches) {
        await fetch(`/api/products/${p._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            costTemplate: pendingApply.template._id,
            costPrice: pendingApply.total,
            costTemplateAppliedTotal: pendingApply.total,
          }),
        });
      }
      setPendingApply(null);
    } catch (e) {
      setError('Some products failed to update — check the Products page.');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cost Templates</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Add Template
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-glacier">No cost templates yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>Template</th>
                <th>Components</th>
                <th>Total Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td className="font-medium">{row.name}</td>
                  <td>
                    {(row.lines || []).map((l, i) => (
                      <div key={i} className="text-xs">
                        {l.component}: ₹{l.cost}
                      </div>
                    ))}
                  </td>
                  <td className="font-semibold">₹{templateTotal(row)}</td>
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

      <p className="text-xs text-glacier mt-3">
        Tip: name a template exactly the same as a Collection (e.g. "Polo") and it will auto-fill for new products in
        that collection, and offer to update existing ones after you save.
      </p>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} Cost Template</h2>

            <div className="mb-4">
              <label className="block text-xs mb-1 text-glacier">Template Name</label>
              <input
                className="input"
                value={form.name}
                required
                placeholder="e.g. Polo, Printed, Plain B&W"
                onChange={(e) => updateField('name', e.target.value)}
              />
              <p className="text-xs text-glacier mt-1">
                Match this exactly to a Collection name to enable auto-fill and bulk updates.
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Cost Components</label>
                <button type="button" className="btn-secondary text-xs" onClick={addLine}>
                  + Add Component
                </button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-end">
                    <div className="sm:col-span-3">
                      <label className="block text-xs mb-1 text-glacier">Component</label>
                      <input
                        className="input"
                        value={line.component}
                        placeholder="e.g. T-Shirt Base"
                        onChange={(e) => updateLine(index, 'component', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs mb-1 text-glacier">Cost (₹)</label>
                      <input
                        className="input"
                        type="number"
                        value={line.cost}
                        onChange={(e) => updateLine(index, 'cost', Number(e.target.value))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs mb-1 text-glacier">Notes</label>
                      <input
                        className="input"
                        value={line.notes}
                        placeholder="optional"
                        onChange={(e) => updateLine(index, 'notes', e.target.value)}
                      />
                    </div>
                    {form.lines.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-500 mb-2"
                        onClick={() => removeLine(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold mt-3">Total Cost Per Unit: ₹{total}</p>
            </div>

            <div className="mb-4">
              <label className="block text-xs mb-1 text-glacier">Notes</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
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

      {pendingApply && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-2">Update existing products?</h2>
            <p className="text-sm text-glacier mb-4">
              {pendingApply.matches.length} product(s) in the "{pendingApply.template.name}" collection can be
              updated to the new cost of ₹{pendingApply.total}.
            </p>
            <div className="space-y-1 mb-4 max-h-64 overflow-y-auto border rounded p-2">
              {pendingApply.matches.map((p) => (
                <div key={p._id} className="text-sm flex justify-between">
                  <span>
                    {p.name} ({p.sku})
                  </span>
                  <span className="text-glacier">
                    ₹{p.costPrice} → ₹{pendingApply.total}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPendingApply(null)}
                disabled={applying}
              >
                Skip
              </button>
              <button type="button" className="btn-primary" onClick={confirmApply} disabled={applying}>
                {applying ? 'Updating…' : `Update ${pendingApply.matches.length} product(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
