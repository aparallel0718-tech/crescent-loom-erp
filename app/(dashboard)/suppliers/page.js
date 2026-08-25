'use client';

import CrudPage from '../../../components/CrudPage';

const config = {
  title: 'Suppliers',
  apiPath: '/api/suppliers',
  columns: [
    { key: 'name', label: 'Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'gstin', label: 'GSTIN' },
  ],
  formFields: [
    { key: 'name', label: 'Supplier Name', required: true },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'gstin', label: 'GSTIN' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

export default function SuppliersPage() {
  return <CrudPage config={config} />;
}
