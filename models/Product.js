import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String },
    productCollection: { type: String }, // e.g. "Spring/Summer 2026" — named to avoid Mongoose's reserved `collection` property
    size: { type: String },
    colour: { type: String },
    sellingPrice: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    material: { type: String },
    reorderLevel: { type: Number, default: 5 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
