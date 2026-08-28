'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Sales',
  apiPath: '/api/sales',
  columns: [
    { key: 'orderId', label: 'Order ID' },
    { key: 'orderDate', label: 'Date', render: (r) => new Date(r.orderDate).toLocaleDateString('en-IN') },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Product' },
    { key: 'qty', label: 'Qty' },
    { key: 'sellingPrice', label: 'Price', render: (r) => `₹${r.sellingPrice}` },
    { key: 'discount', label: 'Discount', render: (r) => `₹${r.discount}` },
    { key: 'paymentMode', label: 'Payment' },
    { key: 'status', label: 'Status' },
  ],
  formFields: [
    { key: 'orderId', label: 'Order ID', required: true },
    { key: 'orderDate', label: 'Order Date', type: 'date', required: true },
    {
      key: 'customer',
      label: 'Customer',
      type: 'select',
      dynamicSource: { apiPath: '/api/customers', valueKey: '_id', labelKey: 'name' },
    },
    { key: 'customerName', label: 'Customer Name (display)' },
    {
  key: 'product',
  label: 'Product',
  type: 'select',
  dynamicSource: {
    apiPath: '/api/products',
    valueKey: '_id',
    labelFn: (o) => `${o.name} — ${o.colour} — ${o.size}`,
  },
},
    { key: 'productName', label: 'Product Name (display)' },
    { key: 'qty', label: 'Qty', type: 'number' },
    { key: 'sellingPrice', label: 'Selling Price', type: 'number' },
    { key: 'discount', label: 'Discount (₹)', type: 'number' },
    { key: 'costPrice', label: 'Cost Price (for margin calc)', type: 'number' },
    {
      key: 'paymentMode',
      label: 'Payment Mode',
      type: 'select',
      options: ['Prepaid', 'COD', 'Card', 'UPI', 'Bank Transfer'].map((v) => ({ value: v, label: v })),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Cancelled'].map((v) => ({ value: v, label: v })),
    },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function SalesPage() {
  return <CrudPage config={config} />;
}
