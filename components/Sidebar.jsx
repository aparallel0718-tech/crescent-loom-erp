'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', section: 'dashboard', group: 'Main' },
  { href: '/products', label: 'Products & Styles', section: 'products', group: 'Main' },
  { href: '/inventory', label: 'Inventory', section: 'inventory', group: 'Main' },
  { href: '/sales', label: 'Sales', section: 'sales', group: 'Main' },
  { href: '/customers', label: 'Customers', section: 'customers', group: 'Main' },

  { href: '/purchases', label: 'Purchases', section: 'purchases', group: 'Operations' },
  { href: '/suppliers', label: 'Suppliers', section: 'purchases', group: 'Operations' },
  { href: '/shipping', label: 'Shipping & Logistics', section: 'shipping', group: 'Operations' },

  { href: '/marketing', label: 'Marketing Expense', section: 'marketing', group: 'Finance' },
  { href: '/expenses', label: 'Operating Expenses', section: 'expenses', group: 'Finance' },
  { href: '/pnl', label: 'Profit & Loss', section: 'pnl', group: 'Finance' },
  { href: '/analytics', label: 'Analytics', section: 'analytics', group: 'Finance' },

  { href: '/alerts', label: 'Alerts', section: 'alerts', group: 'System' },
  { href: '/cost-templates', label: 'Cost Templates', section: 'products', group: 'System' },
  { href: '/users', label: 'Team & Access', section: 'users', group: 'System' },
];

const GROUP_ORDER = ['Main', 'Operations', 'Finance', 'System'];

const ROLE_SECTIONS = {
  admin: null, // sees all
  manager: null, // sees all
  staff: ['dashboard', 'products', 'inventory', 'sales', 'customers', 'purchases', 'shipping', 'alerts'],
};

export default function Sidebar({ role, name }) {
  const pathname = usePathname();
  const allowed = ROLE_SECTIONS[role];
  const items = allowed ? NAV.filter((n) => allowed.includes(n.section)) : NAV;

  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    items: items.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="w-64 bg-midnight text-chalk flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <p className="text-lg tracking-wide" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          Crescent Loom
        </p>
        <p className="text-xs text-glacier mt-1">Business OS</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {groups.map((group) => (
          <div key={group.name} className="mb-4">
            <p className="px-6 pb-1.5 text-[10px] tracking-wider uppercase text-glacier/60">
              {group.name}
            </p>
            {group.items.map((item) => {
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
          </div>
        ))}
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