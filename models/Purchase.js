import mongoose from 'mongoose';

const PurchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    size: { type: String },
    qty: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
  },
  { _id: false }
);

const PurchaseSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    date: { type: Date, required: true, default: Date.now },
    items: { type: [PurchaseItemSchema], default: [] },
    status: { type: String, enum: ['Ordered', 'Received', 'Partially Received', 'Cancelled'], default: 'Ordered' },
    notes: { type: String },
  },
  { timestamps: true }
);

PurchaseSchema.virtual('totalQty').get(function () {
  return (this.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
});
PurchaseSchema.virtual('totalCost').get(function () {
  return (this.items || []).reduce((sum, it) => sum + (it.qty || 0) * (it.costPerUnit || 0), 0);
});
PurchaseSchema.set('toJSON', { virtuals: true });

export default mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);