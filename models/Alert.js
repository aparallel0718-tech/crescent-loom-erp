import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Low Stock', 'Out of Stock', 'Refund Pending', 'Target Achieved', 'Custom'],
      required: true,
    },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    resolved: { type: Boolean, default: false },
    relatedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  },
  { timestamps: true }
);

export default mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
