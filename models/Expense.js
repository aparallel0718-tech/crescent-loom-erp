import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Marketing', 'Operating'], required: true },
    // Marketing categories: Meta Ads, Google Ads, Influencer, Other
    // Operating categories: Business Related, E-Commerce, Marketing, Finance, Other
    category: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
