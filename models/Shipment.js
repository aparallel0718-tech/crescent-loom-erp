import mongoose from 'mongoose';

const ShipmentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    courier: { type: String },
    awb: { type: String },
    shippingCost: { type: Number, default: 0 },
    codAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending Pickup', 'In Transit', 'Delivered', 'RTO', 'Lost'], default: 'Pending Pickup' },
    dispatchDate: { type: Date },
    deliveryDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Shipment || mongoose.model('Shipment', ShipmentSchema);
