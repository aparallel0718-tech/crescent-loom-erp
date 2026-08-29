import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String },
    opening: { type: Number, default: 0 },
    purchased: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    returned: { type: Number, default: 0 },
    exchanged: { type: Number, default: 0 },
    damaged: { type: Number, default: 0 },
    consumables: { type: Number, default: 0 },
    warehouse: { type: String, default: 'Main' },
    period: { type: String }, // e.g. "2026-08" for monthly stock ledger entries
    notes: { type: String },
  },
  { timestamps: true }
);

// current stock = opening + purchased - sold + returned - exchanged - damaged - consumables
InventorySchema.virtual('currentStock').get(function () {
  return (
    (this.opening || 0) +
    (this.purchased || 0) -
    (this.sold || 0) +
    (this.returned || 0) -
    (this.exchanged || 0) -
    (this.damaged || 0) -
    (this.consumables || 0)
  );
});
InventorySchema.set('toJSON', { virtuals: true });

export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
