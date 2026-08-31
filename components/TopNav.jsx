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

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>
  ),
  inventory: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></svg>
  ),
  sales: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg>
  ),
  customers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.2" /><path d="M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5" /></svg>
  ),
  purchases: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h2l1.5 12h11L21 8H7" /><circle cx="9" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>
  ),
  shipping: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="12" height="9" rx="1.2" /><path d="M14 10h4l3 3v3h-7" /><circle cx="6.5" cy="18.5" r="1.4" /><circle cx="17.5" cy="18.5" r="1.4" /></svg>
  ),
  marketing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 10v4h4l6 4V6L7 10H3Z" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>
  ),
  expenses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M7 9h10M7 13h6" /></svg>
  ),
  pnl: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="12" width="3.5" height="8" /><rect x="10.25" y="7" width="3.5" height="13" /><rect x="16.5" y="3" width="3.5" height="17" /></svg>
  ),
  alerts: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>
  ),
  'cost-templates': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M17 8.5a2.5 2.5 0 1 1 0-5" /><path d="M22 20c0-3-2-5-4.5-5.7" /></svg>
  ),
};

function iconFor(item) {
  return ICONS[item.href.replace('/', '')] || ICONS.dashboard;
}

// Shared frosted-glass pill style for each functional cluster in the header
const glass = 'bg-white/40 backdrop-blur-md border border-white/60 shadow-sm';

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
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    // No background/border on the header itself — only the clusters inside get glass styling,
    // so empty space stays part of the page background instead of a solid bar.
    <header ref={containerRef} className="sticky top-0 z-40">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className={`flex items-center gap-3 shrink-0 rounded-full px-3 py-1.5 ${glass}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-midnight to-gold flex items-center justify-center text-sm font-bold text-white shadow-sm">
            C
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none text-midnight">Crescent Loom</p>
            <p className="text-[10px] text-glacier mt-0.5">Business OS</p>
          </div>
        </div>

        <nav className={`hidden md:flex items-center gap-1 rounded-full px-2 py-1.5 ${glass}`}>
          {groups.map((group) => {
            const isOpen = openGroup === group.name;
            const isActive = activeGroup?.name === group.name;
            return (
              <button
                key={group.name}
                onClick={() => setOpenGroup(isOpen ? null : group.name)}
                className={`text-xs font-semibold tracking-wider uppercase px-4 py-1.5 rounded-full transition-colors ${
                  isOpen || isActive
                    ? 'bg-white/70 text-midnight'
                    : 'text-glacier hover:text-midnight'
                }`}
              >
                {group.name}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div className={`hidden lg:flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-glacier w-48 ${glass}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <span>Search…</span>
          </div>

          <button className={`relative w-9 h-9 rounded-full flex items-center justify-center text-midnight ${glass}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3a5 5 0 0 0-5 5v3.5L5 15h14l-2-3.5V8a5 5 0 0 0-5-5Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
          </button>

          <div className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 ${glass}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-midnight to-gold flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {initial}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-midnight leading-none">{name}</p>
              <p className="text-[10px] text-glacier mt-0.5 capitalize">{role}</p>
            </div>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-gold hover:underline ml-1">
              Sign out
            </button>
          </div>
        </div>
      </div>

      {openGroup && (
        <div className="absolute left-0 right-0 flex justify-center px-6">
          <div className="mt-2 w-full max-w-3xl rounded-2xl border border-white/60 bg-white/50 backdrop-blur-xl shadow-xl p-5 dropdown-enter">
            <p className="text-[10px] tracking-wider uppercase text-glacier mb-3">{openGroup}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {groups
                .find((g) => g.name === openGroup)
                .items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenGroup(null)}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-white/60 transition-colors"
                  >
                    <span className="text-midnight mt-0.5">{iconFor(item)}</span>
                    <span>
                      <span className="block text-sm text-midnight font-medium">{item.label}</span>
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