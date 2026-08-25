'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Purchases',
  apiPath: '/api/purchases',
  columns: [
    { key: 'poNumber', label: 'Purchase Order' },
    { key: 'supplierName', label: 'Supplier' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-IN') },
    { key: 'productName', label: 'Product' },
    { key: 'qty', label: 'Qty' },
    { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => `₹${r.costPerUnit}` },
    { key: 'totalCost', label: 'Total Cost', render: (r) => `₹${r.qty * r.costPerUnit}` },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'poNumber', label: 'Purchase Order #', required: true },
    {
      key: 'supplier',
      label: 'Supplier',
      type: 'select',
      dynamicSource: { apiPath: '/api/suppliers', valueKey: '_id', labelKey: 'name' },
    },
    { key: 'supplierName', label: 'Supplier Name (display)' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    {
      key: 'product',
      label: 'Product',
      type: 'select',
      dynamicSource: { apiPath: '/api/products', valueKey: '_id', labelKey: 'name' },
    },
    { key: 'productName', label: 'Product Name (display)' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'costPerUnit', label: 'Cost per Unit', type: 'number' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['Ordered', 'Received', 'Partially Received', 'Cancelled'].map((v) => ({ value: v, label: v })),
    },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function PurchasesPage() {
  return <CrudPage config={config} />;
}
