'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Operating Expenses',
  apiPath: '/api/expenses?type=Operating',
  columns: [
    { key: 'category', label: 'Category' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-IN') },
    { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount}` },
    { key: 'notes', label: 'Notes' },
  ],
  formFields: [
    { key: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'Operating', label: 'Operating' }] },
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: ['Business Related', 'E-Commerce', 'Marketing', 'Finance', 'Other'].map((v) => ({ value: v, label: v })),
    },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function ExpensesPage() {
  return <CrudPage config={config} />;
}
