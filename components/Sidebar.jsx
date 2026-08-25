'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', section: 'dashboard' },
  { href: '/products', label: 'Products & Styles', section: 'products' },
  { href: '/inventory', label: 'Inventory', section: 'inventory' },
  { href: '/sales', label: 'Sales', section: 'sales' },
  { href: '/customers', label: 'Customers', section: 'customers' },
  { href: '/purchases', label: 'Purchases', section: 'purchases' },
  { href: '/suppliers', label: 'Suppliers', section: 'purchases' },
  { href: '/shipping', label: 'Shipping & Logistics', section: 'shipping' },
  { href: '/marketing', label: 'Marketing Expense', section: 'marketing' },
  { href: '/expenses', label: 'Operating Expenses', section: 'expenses' },
  { href: '/pnl', label: 'Profit & Loss', section: 'pnl' },
  { href: '/analytics', label: 'Analytics', section: 'analytics' },
  { href: '/alerts', label: 'Alerts', section: 'alerts' },
  { href: '/users', label: 'Team & Access', section: 'users' },
];

const ROLE_SECTIONS = {
  admin: null, // sees all
  manager: null, // sees all
  staff: ['dashboard', 'products', 'inventory', 'sales', 'customers', 'purchases', 'shipping', 'alerts'],
};

export default function Sidebar({ role, name }) {
  const pathname = usePathname();
  const allowed = ROLE_SECTIONS[role];
  const items = allowed ? NAV.filter((n) => allowed.includes(n.section)) : NAV;

  return (
    <aside className="w-64 bg-midnight text-chalk flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <p className="text-lg tracking-wide" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Crescent Loom
        </p>
        <p className="text-xs text-glacier mt-1">Business OS</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-6 py-2.5 text-sm ${
                active ? 'bg-white/10 text-gold border-r-2 border-gold' : 'text-chalk/80 hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-glacier mb-2">
          {name} · <span className="capitalize">{role}</span>
        </p>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gold hover:underline">
          Sign out
        </button>
      </div>
    </aside>
  );
}
