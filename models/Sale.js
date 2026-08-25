import mongoose from 'mongoose';

const SaleSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    orderDate: { type: Date, required: true, default: Date.now },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    qty: { type: Number, default: 1 },
    sellingPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['Prepaid', 'COD', 'Card', 'UPI', 'Bank Transfer'], default: 'Prepaid' },
    status: { type: String, enum: ['Placed', 'Confirmed', 'Shipped', 'Delivered', 'Returned', 'Cancelled'], default: 'Placed' },
    notes: { type: String },
  },
  { timestamps: true }
);

SaleSchema.virtual('netValue').get(function () {
  return this.qty * this.sellingPrice - (this.discount || 0);
});
SaleSchema.set('toJSON', { virtuals: true });

export default mongoose.models.Sale || mongoose.model('Sale', SaleSchema);
