'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Products & Styles',
  apiPath: '/api/products',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'category', label: 'Category' },
    { key: 'productCollection', label: 'Collection' },
    { key: 'size', label: 'Size' },
    { key: 'colour', label: 'Colour' },
    { key: 'sellingPrice', label: 'Selling Price', render: (r) => `₹${r.sellingPrice}` },
    { key: 'mrp', label: 'MRP', render: (r) => `₹${r.mrp}` },
    { key: 'costPrice', label: 'Cost', render: (r) => `₹${r.costPrice}` },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'name', label: 'Product Name', required: true },
    { key: 'sku', label: 'SKU', required: true },
    { key: 'category', label: 'Category' },
    { key: 'productCollection', label: 'Collection' },
    { key: 'size', label: 'Size' },
    { key: 'colour', label: 'Colour' },
    { key: 'material', label: 'Material' },
    { key: 'sellingPrice', label: 'Selling Price', type: 'number' },
    { key: 'mrp', label: 'MRP', type: 'number' },
    { key: 'discountPct', label: 'Discount %', type: 'number' },
    { key: 'costPrice', label: 'Costing', type: 'number' },
    { key: 'reorderLevel', label: 'Reorder Level', type: 'number' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function ProductsPage() {
  return <CrudPage config={config} />;
}
