import Inventory from '../models/Inventory';

// direction: 1 to increase, -1 to decrease
export async function applyInventoryDelta(items, field, direction) {
  for (const it of items || []) {
    if (!it.product || !it.qty) continue;
    const inv = await Inventory.findOne({ product: it.product }).sort({ createdAt: -1 });
    if (inv) {
      inv[field] = (inv[field] || 0) + direction * it.qty;
      await inv.save();
    }
  }
}