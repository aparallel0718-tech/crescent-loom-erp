'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Shipping & Logistics',
  apiPath: '/api/shipments',
  columns: [
    { key: 'orderId', label: 'Order ID' },
    { key: 'courier', label: 'Courier' },
    { key: 'awb', label: 'AWB' },
    { key: 'shippingCost', label: 'Shipping Cost', render: (r) => `₹${r.shippingCost}` },
    { key: 'codAmount', label: 'COD Amount', render: (r) => `₹${r.codAmount}` },
    { key: 'status', label: 'Status' },
    { key: 'dispatchDate', label: 'Dispatched', render: (r) => (r.dispatchDate ? new Date(r.dispatchDate).toLocaleDateString('en-IN') : '—') },
  ],
  formFields: [
    { key: 'orderId', label: 'Order ID', required: true },
    { key: 'courier', label: 'Courier' },
    { key: 'awb', label: 'AWB Number' },
    { key: 'shippingCost', label: 'Shipping Cost', type: 'number' },
    { key: 'codAmount', label: 'COD Amount', type: 'number' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['Pending Pickup', 'In Transit', 'Delivered', 'RTO', 'Lost'].map((v) => ({ value: v, label: v })),
    },
    { key: 'dispatchDate', label: 'Dispatch Date', type: 'date' },
    { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function ShippingPage() {
  return <CrudPage config={config} />;
}
