'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', section: 'dashboard', group: 'Main', desc: 'Overview of your business' },
  { href: '/products', label: 'Products & Styles', section: 'products', group: 'Main', desc: 'Manage products & styles' },
  { href: '/inventory', label: 'Inventory', section: 'inventory', group: 'Main', desc: 'Stock and warehouse' },
  { href: '/sales', label: 'Sales', section: 'sales', group: 'Main', desc: 'Orders and revenue' },
  { href: '/customers', label: 'Customers', section: 'customers', group: 'Main', desc: 'Customer database' },

  { href: '/purchases', label: 'Purchases', section: 'purchases', group: 'Operations', desc: 'Purchase orders' },
  { href: '/suppliers', label: 'Suppliers', section: 'purchases', group: 'Operations', desc: 'Supplier directory' },
  { href: '/shipping', label: 'Shipping & Logistics', section: 'shipping', group: 'Operations', desc: 'Dispatch and delivery' },

  { href: '/marketing', label: 'Marketing Expense', section: 'marketing', group: 'Finance', desc: 'Ad spend tracking' },
  { href: '/expenses', label: 'Operating Expenses', section: 'expenses', group: 'Finance', desc: 'Business expenses' },
  { href: '/pnl', label: 'Profit & Loss', section: 'pnl', group: 'Finance', desc: 'P&L statement' },
  { href: '/analytics', label: 'Analytics', section: 'analytics', group: 'Finance', desc: 'Business insights' },

  { href: '/alerts', label: 'Alerts', section: 'alerts', group: 'System', desc: 'Stock and system alerts' },
  { href: '/cost-templates', label: 'Cost Templates', section: 'products', group: 'System', desc: 'Reusable cost breakdowns' },
  { href: '/users', label: 'Team & Access', section: 'users', group: 'System', desc: 'Manage team roles' },
];

const GROUP_ORDER = ['Main', 'Operations', 'Finance', 'System'];

const ROLE_SECTIONS = {
  admin: null,
  manager: null,
  staff: ['dashboard', 'products', 'inventory', 'sales', 'customers', 'purchases', 'shipping', 'alerts'],
};

function ItemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default function TopNav({ role, name }) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState(null);
  const containerRef = useRef(null);

  const allowed = ROLE_SECTIONS[role];
  const items = allowed ? NAV.filter((n) => allowed.includes(n.section)) : NAV;

  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    items: items.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  const activeGroup = groups.find((g) => g.items.some((i) => i.href === pathname));

  return (
    <header ref={containerRef} className="sticky top-0 z-40 bg-midnight text-chalk border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-xs font-bold text-white">
            C
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Crescent Loom</p>
            <p className="text-[10px] text-glacier mt-0.5">Business OS</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {groups.map((group) => {
            const isOpen = openGroup === group.name;
            const isActive = activeGroup?.name === group.name;
            return (
              <button
                key={group.name}
                onClick={() => setOpenGroup(isOpen ? null : group.name)}
                className={`text-xs tracking-wider uppercase pb-1 border-b-2 transition-colors ${
                  isOpen || isActive
                    ? 'text-gold border-gold'
                    : 'text-chalk/70 border-transparent hover:text-chalk'
                }`}
              >
                {group.name}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <p className="hidden sm:block text-xs text-glacier">
            {name} · <span className="capitalize">{role}</span>
          </p>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gold hover:underline">
            Sign out
          </button>
        </div>
      </div>

      {openGroup && (
        <div className="absolute left-0 right-0 flex justify-center px-6">
          <div className="mt-2 w-full max-w-3xl rounded-2xl border border-white/10 bg-midnight/95 backdrop-blur-xl shadow-2xl p-5">
            <p className="text-[10px] tracking-wider uppercase text-glacier/60 mb-3">{openGroup}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {groups
                .find((g) => g.name === openGroup)
                .items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenGroup(null)}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-gold mt-0.5">
                      <ItemIcon />
                    </span>
                    <span>
                      <span className="block text-sm text-chalk">{item.label}</span>
                      <span className="block text-xs text-glacier">{item.desc}</span>
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}