'use client';
import { useEffect, useState } from 'react';

function emptyLine() {
  return { component: '', cost: 0, notes: '' };
}

function emptyTemplate() {
  return { name: '', lines: [emptyLine()], notes: '' };
}

function money(n) {
  const v = Number(n) || 0;
  return `\u20B9${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-glacier mb-1 uppercase tracking-wide">System /</p>
          <h1 className="text-3xl font-semibold">
            <span className="text-[#F2F1EE]">Cost </span>
            <span className="text-[#E8B563]">Templates</span>
          </h1>
          <p className="text-sm text-glacier mt-1">Manage reusable cost structures for your collections.</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden md:block text-sm italic text-[#E8B563]/80 text-right max-w-[220px]">
            “Build once,<br />use across collections.”
          </p>
          <button
            className="text-sm font-semibold px-6 py-3 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)] whitespace-nowrap"
            onClick={openCreate}
          >
            + Add Template
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">{'Loading\u2026'}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-glacier">No cost templates yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th>Template</th>
                <th>Components</th>
                <th>Total Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const lines = row.lines || [];
                return (
                  <tr key={row._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl border border-white/10 bg-black/30 flex items-center justify-center text-glacier shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M8 4 4 7l3 3 1-1v9h8v-9l1 1 3-3-4-3h-2a2 2 0 0 1-4 0Z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-[#F2F1EE]">{row.name}</p>
                          <p className="text-xs text-glacier">{lines.length} component{lines.length === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2 max-w-md">
                        {lines.map((l, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-glacier whitespace-nowrap">
                            {l.component || 'Component'} <span className="text-[#F2F1EE]">{money(l.cost)}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="font-semibold text-[#E8B563]">{money(templateTotal(row))}</td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-[#E8B563]/30 text-[#E8B563] hover:bg-[#E8B563]/10"
                          onClick={() => openEdit(row)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDelete(row)}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card mt-4 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#E8B563] mt-0.5 shrink-0"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" /></svg>
        <p className="text-sm text-glacier">
          Tip: name a template exactly the same as a Collection (e.g. &quot;Polo&quot;) and it will auto-fill for new products in
          that collection, and offer to update existing ones after you save.
        </p>
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 4 4 7l3 3 1-1v9h8v-9l1 1 3-3-4-3h-2a2 2 0 0 1-4 0Z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Cost Template</h2>
                  <p className="text-xs text-glacier">{editing ? 'Update this cost template.' : 'Create a reusable cost structure.'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-glacier hover:text-[#F2F1EE]">
                {'\u00D7'}
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Template Name</label>
              <input
                className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                value={form.name}
                required
                placeholder="e.g. Polo, Printed, Plain B&W"
                onChange={(e) => updateField('name', e.target.value)}
              />
              <p className="text-xs text-glacier mt-1">
                Match this exactly to a Collection name to enable auto-fill and bulk updates.
              </p>
            </div>

            <div className="border-t border-white/10 pt-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-[#E8B563]">Cost Components</label>
                <button
                  type="button"
                  className="text-xs font-semibold px-4 py-2 rounded-full border border-[#E8B563]/40 text-[#E8B563] hover:bg-[#E8B563]/10"
                  onClick={addLine}
                >
                  + Add Component
                </button>
              </div>
              <div className="space-y-2">
                {form.lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-end">
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Component</label>
                      <input
                        className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                        value={line.component}
                        placeholder="e.g. T-Shirt Base"
                        onChange={(e) => updateLine(index, 'component', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Cost ({'\u20B9'})</label>
                      <div className="flex items-center bg-black/30 border border-white/10 rounded-full px-4">
                        <span className="text-glacier text-sm mr-1">{'\u20B9'}</span>
                        <input
                          className="bg-transparent outline-none py-3 text-sm text-[#F2F1EE] w-full"
                          type="number"
                          value={line.cost}
                          onChange={(e) => updateLine(index, 'cost', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Notes</label>
                      <input
                        className="input bg-black/30 border-white/10 text-[#F2F1EE]"
                        value={line.notes}
                        placeholder="optional"
                        onChange={(e) => updateLine(index, 'notes', e.target.value)}
                      />
                    </div>
                    {form.lines.length > 1 && (
                      <button
                        type="button"
                        className="text-xs text-red-400 mb-3"
                        onClick={() => removeLine(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-[#E8B563] mt-3">Total Cost Per Unit: {money(total)}</p>
            </div>

            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-wide mb-1 text-glacier">Notes</label>
              <textarea
                className="input bg-black/30 border-white/10 text-[#F2F1EE] placeholder:text-glacier"
                rows={2}
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-[#F2F1EE] hover:bg-white/5"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingApply && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#131215] border border-[#E8B563]/30 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto text-[#F2F1EE] shadow-[0_0_60px_rgba(232,181,99,0.08)]">
            <h2 className="text-lg font-semibold mb-2 text-[#E8B563]">Update existing products?</h2>
            <p className="text-sm text-glacier mb-4">
              {pendingApply.matches.length} product(s) in the &quot;{pendingApply.template.name}&quot; collection can be
              updated to the new cost of {money(pendingApply.total)}.
            </p>
            <div className="space-y-1 mb-4 max-h-64 overflow-y-auto border border-white/10 rounded-lg p-2">
              {pendingApply.matches.map((p) => (
                <div key={p._id} className="text-sm flex justify-between py-1">
                  <span>
                    {p.name} ({p.sku})
                  </span>
                  <span className="text-glacier">
                    {money(p.costPrice)} {'\u2192'} {money(pendingApply.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="text-sm px-5 py-2.5 rounded-full border border-white/10 text-[#F2F1EE] hover:bg-white/5"
                onClick={() => setPendingApply(null)}
                disabled={applying}
              >
                Skip
              </button>
              <button
                type="button"
                className="text-sm font-semibold px-5 py-2.5 rounded-full bg-gradient-to-b from-[#F2CD85] to-[#C9973F] text-black shadow-[0_4px_12px_rgba(232,181,99,0.35)]"
                onClick={confirmApply}
                disabled={applying}
              >
                {applying ? 'Updating\u2026' : `Update ${pendingApply.matches.length} product(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
