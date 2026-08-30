import mongoose from 'mongoose';

const CostLineSchema = new mongoose.Schema(
  {
    component: { type: String, required: true },
    cost: { type: Number, default: 0 },
    notes: { type: String },
  },
  { _id: false }
);

const CostTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    lines: { type: [CostLineSchema], default: [] },
    notes: { type: String },
  },
  { timestamps: true }
);

CostTemplateSchema.virtual('totalCost').get(function () {
  return (this.lines || []).reduce((sum, l) => sum + (l.cost || 0), 0);
});
CostTemplateSchema.set('toJSON', { virtuals: true });

export default mongoose.models.CostTemplate || mongoose.model('CostTemplate', CostTemplateSchema);