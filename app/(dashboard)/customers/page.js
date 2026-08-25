'use client';

import { useEffect, useState } from 'react';
import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Customers',
  apiPath: '/api/customers',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone No.' },
    { key: 'email', label: 'Email' },
    { key: 'location', label: 'Location' },
    { key: 'totalOrders', label: 'Total Orders', render: (r) => r.totalOrders ?? '—' },
    { key: 'avgSpent', label: 'Avg Spent', render: (r) => (r.avgSpent != null ? `₹${Math.round(r.avgSpent)}` : '—') },
  ],
  formFields: [
    { key: 'name', label: 'Name', required: true },
    { key: 'phone', label: 'Phone No.' },
    { key: 'email', label: 'Email' },
    { key: 'location', label: 'Location' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

// Wraps CrudPage but enriches rows with order stats pulled from /api/sales client-side,
// since orders live in a separate collection keyed by customer name/id.
export default function CustomersPage() {
  const [salesByCustomer, setSalesByCustomer] = useState({});

  useEffect(() => {
    fetch('/api/sales')
      .then((r) => r.json())
      .then((sales) => {
        const map = {};
        for (const s of sales) {
          const key = s.customer || s.customerName;
          if (!key) continue;
          if (!map[key]) map[key] = { count: 0, total: 0 };
          map[key].count += 1;
          map[key].total += s.qty * s.sellingPrice - (s.discount || 0);
        }
        setSalesByCustomer(map);
      });
  }, []);

  const enrichedConfig = {
    ...config,
    columns: config.columns.map((c) =>
      c.key === 'totalOrders'
        ? { ...c, render: (r) => salesByCustomer[r._id]?.count ?? salesByCustomer[r.name]?.count ?? 0 }
        : c.key === 'avgSpent'
        ? {
            ...c,
            render: (r) => {
              const stat = salesByCustomer[r._id] || salesByCustomer[r.name];
              return stat && stat.count ? `₹${Math.round(stat.total / stat.count)}` : '—';
            },
          }
        : c
    ),
  };

  return <CrudPage config={enrichedConfig} />;
}
