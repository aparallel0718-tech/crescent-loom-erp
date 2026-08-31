'use client';
import { inr } from '../lib/format';

const STATUS_STYLE = {
  Placed: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Delivered: 'bg-emerald-100 text-emerald-700',
  Returned: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-600',
};

export default function RecentOrders({ orders }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Recent Orders</h2>
      </div>
      {(!orders || orders.length === 0) ? (
        <p className="text-sm text-glacier">No orders in this period yet.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Products</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId}>
                <td className="font-medium">#{o.orderId}</td>
                <td>{o.customerName}</td>
                <td>
                  {o.items.map((it, i) => (
                    <span key={i} className="block text-xs">
                      {it.productName} × {it.qty}
                    </span>
                  ))}
                </td>
                <td>{inr(o.amount)}</td>
                <td>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-600'}`}>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}