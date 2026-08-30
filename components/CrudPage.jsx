'use client';

import { useEffect, useState } from 'react';

// config = {
//   title, apiPath,
//   columns: [{ key, label, render?(row) }],
//   formFields: [{ key, label, type: 'text'|'number'|'date'|'select'|'textarea',
//                  options?: [{value,label}], dynamicSource?: { apiPath, valueKey, labelKey } }]
// }
export default function CrudPage({ config }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({});  function buildItemUrl(id) {
    const [base, query] = config.apiPath.split('?');
    return query ? `${base}/${id}?${query}` : `${base}/${id}`;
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(config.apiPath);
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
    // load dynamic select options
    config.formFields
      .filter((f) => f.dynamicSource)
      .forEach(async (f) => {
        const res = await fetch(f.dynamicSource.apiPath);
        if (res.ok) {
          const data = await res.json();
          setDynamicOptions((prev) => ({ ...prev, [f.key]: data }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.apiPath]);

  function openCreate() {
    setEditing(null);
    setForm({});
    setShowForm(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(row);
    setShowForm(true);
  }

  async function handleDelete(row) {
    if (!confirm('Delete this record?')) return;
    const res = await fetch(buildItemUrl(row._id), { method: 'DELETE' });
    if (res.ok) load();
    else setError((await res.json()).error || 'Delete failed');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? buildItemUrl(editing._id) : config.apiPath;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      load();
    } else {
      setError((await res.json()).error || 'Save failed');
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{config.title}</h1>
        <button className="btn-primary" onClick={openCreate}>
          + Add {config.title}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-glacier">No records yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {config.columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  {config.columns.map((c) => (
                    <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                  ))}
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
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Edit' : 'Add'} {config.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {config.formFields.map((f) => (
                <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs mb-1 text-glacier">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      className="input"
                      value={form[f.key] ?? ''}
                      required={f.required}
                      onChange={(e) => updateField(f.key, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(f.dynamicSource
  ? (dynamicOptions[f.key] || []).map((o) => ({
      value: o[f.dynamicSource.valueKey],
      label: f.dynamicSource.labelFn ? f.dynamicSource.labelFn(o) : o[f.dynamicSource.labelKey],
    }))
  : f.options || []
).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea
                      className="input"
                      rows={3}
                      value={form[f.key] ?? ''}
                      onChange={(e) => updateField(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="input"
                      type={f.type || 'text'}
                      value={form[f.key] ?? ''}
                      required={f.required}
                      onChange={(e) =>
                        updateField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)
                      }
                    />
                  )}
                </div>
              ))}
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
