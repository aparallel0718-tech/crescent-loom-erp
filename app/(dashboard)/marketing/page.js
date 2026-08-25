'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Marketing Expense',
  apiPath: '/api/expenses?type=Marketing',
  columns: [
    { key: 'category', label: 'Channel' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-IN') },
    { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount}` },
    { key: 'notes', label: 'Notes' },
  ],
  formFields: [
    { key: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'Marketing', label: 'Marketing' }] },
    {
      key: 'category',
      label: 'Channel',
      type: 'select',
      required: true,
      options: ['Meta Ads', 'Google Ads', 'Influencer', 'Content Production', 'Other'].map((v) => ({ value: v, label: v })),
    },
    { key: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function MarketingPage() {
  return (
    <div>
      <CrudPage config={config} />
      <p className="text-xs text-glacier mt-4">
        Marketing spend as % of revenue is shown on the main Dashboard.
      </p>
    </div>
  );
}
