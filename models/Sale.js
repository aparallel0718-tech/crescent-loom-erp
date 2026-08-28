import mongoose from 'mongoose';

const SaleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    size: { type: String },
    qty: { type: Number, default: 1 },
    sellingPrice: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
  },
  { _id: false }
);
const SaleSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    orderDate: { type: Date, required: true, default: Date.now },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    items: { type: [SaleItemSchema], default: [] },
    discount: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['Prepaid', 'COD', 'Card', 'UPI', 'Bank Transfer'], default: 'Prepaid' },
    status: { type: String, enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Cancelled'], default: 'Placed' },
    notes: { type: String },
  },
  { timestamps: true }
);

SaleSchema.virtual('netValue').get(function () {
  const itemsTotal = (this.items || []).reduce((sum, it) => sum + (it.qty || 0) * (it.sellingPrice || 0), 0);
  return itemsTotal - (this.discount || 0);
});
SaleSchema.set('toJSON', { virtuals: true });

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);