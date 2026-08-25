'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  async function load() {
    setLoading(true);
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    else setError((await res.json()).error);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      load();
    } else {
      setError((await res.json()).error || 'Failed to create user');
    }
  }

  async function handleDelete(u) {
    if (!confirm(`Remove ${u.name} from the team?`)) return;
    await fetch(`/api/users/${u._id}`, { method: 'DELETE' });
    load();
  }

  if (session && session.user.role !== 'admin') {
    return <p className="text-sm text-glacier">Only admins can manage team access.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Team &amp; Access</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Team Member</button>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="card">
        {loading ? (
          <p className="text-sm text-glacier">Loading…</p>
        ) : (
          <table className="w-full">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td><td>{u.email}</td><td className="capitalize">{u.role}</td>
                  <td className="text-right">
                    <button className="text-xs text-red-500" onClick={() => handleDelete(u)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-glacier mt-4">
        <strong>Admin</strong> and <strong>Manager</strong> see every section. <strong>Staff</strong> see Dashboard, Products,
        Inventory, Sales, Customers, Purchases, Shipping and Alerts — not Marketing/Expenses/P&amp;L/Team.
      </p>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add Team Member</h2>
            <label className="block text-xs mb-1 text-glacier">Name</label>
            <input className="input mb-4" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="block text-xs mb-1 text-glacier">Email</label>
            <input className="input mb-4" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="block text-xs mb-1 text-glacier">Temporary Password</label>
            <input className="input mb-4" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <label className="block text-xs mb-1 text-glacier">Role</label>
            <select className="input mb-6" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
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
