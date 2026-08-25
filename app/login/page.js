'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { redirect: false, email, password });
    setLoading(false);
    if (res?.error) {
      setError('Invalid email or password.');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight">
      <form onSubmit={handleSubmit} className="bg-chalk rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <h1 className="text-xl font-semibold tracking-wide mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Crescent Loom
        </h1>
        <p className="text-sm text-glacier mb-6">Business OS — sign in</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <label className="block text-xs mb-1 text-glacier">Email</label>
        <input className="input mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="block text-xs mb-1 text-glacier">Password</label>
        <input className="input mb-6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
