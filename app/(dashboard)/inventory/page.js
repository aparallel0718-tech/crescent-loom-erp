'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Inventory',
  apiPath: '/api/inventory',
  columns: [
    { key: 'sku', label: 'SKU', render: (r) => r.product?.sku || r.sku },
    { key: 'product', label: 'Product', render: (r) => r.product?.name || '—' },
    { key: 'opening', label: 'Opening' },
    { key: 'purchased', label: 'Purchase' },
    { key: 'sold', label: 'Sold' },
    { key: 'returned', label: 'Return' },
    { key: 'exchanged', label: 'Exchange' },
    { key: 'damaged', label: 'Damaged' },
    { key: 'consumables', label: 'Consumables' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'warehouse', label: 'Warehouse' },
  ],
  formFields: [
    {
      key: 'product',
      label: 'Product',
      type: 'select',
      required: true,
      dynamicSource: { apiPath: '/api/products', valueKey: '_id', labelKey: 'name' },
    },
    { key: 'sku', label: 'SKU (optional override)' },
    { key: 'period', label: 'Period (e.g. 2026-08)' },
    { key: 'opening', label: 'Opening Stock', type: 'number' },
    { key: 'purchased', label: 'Purchased', type: 'number' },
    { key: 'sold', label: 'Sold', type: 'number' },
    { key: 'returned', label: 'Returned', type: 'number' },
    { key: 'exchanged', label: 'Exchanged', type: 'number' },
    { key: 'damaged', label: 'Damaged', type: 'number' },
    { key: 'consumables', label: 'Consumables', type: 'number' },
    { key: 'warehouse', label: 'Warehouse / Location' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function InventoryPage() {
  return <CrudPage config={config} />;
}
