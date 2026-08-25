'use client';

import { useEffect, useState } from 'react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Custom', message: '', severity: 'info' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/alerts');
    setAlerts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function runChecks() {
    setChecking(true);
    await fetch('/api/alerts/run-checks', { method: 'POST' });
    await load();
    setChecking(false);
  }

  async function toggleResolved(alert) {
    await fetch(`/api/alerts/${alert._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: !alert.resolved }),
    });
    load();
  }

  async function createCustomAlert(e) {
    e.preventDefault();
    await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ type: 'Custom', message: '', severity: 'info' });
    load();
  }

  const active = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Alerts &amp; Notifications</h1>
        <div className="flex gap-3">
          <button className="btn-secondary" onClick={runChecks} disabled={checking}>
            {checking ? 'Checking…' : 'Run Stock Check'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Custom Alert
          </button>
        </div>
      </div>
      <p className="text-xs text-glacier mb-4">
        &ldquo;Run Stock Check&rdquo; scans inventory for low/out-of-stock products. For fully automatic checks, add a
        Vercel Cron Job that calls <code>/api/alerts/run-checks</code> on a schedule (see README).
      </p>

      {loading ? (
        <p className="text-sm text-glacier">Loading…</p>
      ) : (
        <>
          <div className="card mb-6">
            <h2 className="font-semibold mb-3">Active ({active.length})</h2>
            {active.length === 0 ? (
              <p className="text-sm text-glacier">No active alerts.</p>
            ) : (
              <div className="space-y-2">
                {active.map((a) => (
                  <div
                    key={a._id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      a.severity === 'critical' ? 'border-red-200 bg-red-50' : a.severity === 'warning' ? 'border-gold/40 bg-cream' : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{a.type}</p>
                      <p className="text-sm text-glacier">{a.message}</p>
                    </div>
                    <button className="text-xs text-gold" onClick={() => toggleResolved(a)}>
                      Mark resolved
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {resolved.length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-3">Resolved ({resolved.length})</h2>
              <div className="space-y-2">
                {resolved.map((a) => (
                  <div key={a._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 opacity-60">
                    <div>
                      <p className="text-sm font-medium">{a.type}</p>
                      <p className="text-sm text-glacier">{a.message}</p>
                    </div>
                    <button className="text-xs text-glacier" onClick={() => toggleResolved(a)}>
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={createCustomAlert} className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Custom Alert</h2>
            <label className="block text-xs mb-1 text-glacier">Message</label>
            <textarea
              className="input mb-4"
              rows={3}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="e.g. Refund pending for order #1042"
            />
            <label className="block text-xs mb-1 text-glacier">Type</label>
            <select className="input mb-4" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['Refund Pending', 'Target Achieved', 'Custom'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label className="block text-xs mb-1 text-glacier">Severity</label>
            <select className="input mb-6" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {['info', 'warning', 'critical'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
