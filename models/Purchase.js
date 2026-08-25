import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    date: { type: Date, required: true, default: Date.now },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    qty: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    status: { type: String, enum: ['Ordered', 'Received', 'Partially Received', 'Cancelled'], default: 'Ordered' },
    notes: { type: String },
  },
  { timestamps: true }
);

PurchaseSchema.virtual('totalCost').get(function () {
  return (this.qty || 0) * (this.costPerUnit || 0);
});
PurchaseSchema.set('toJSON', { virtuals: true });

export default mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);
