import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/mongodb';
import Inventory from '../../../../models/Inventory';
import Alert from '../../../../models/Alert';

// POST /api/alerts/run-checks — scans stock levels and creates alerts for anything
// that doesn't already have an unresolved alert of the same type.
// GET is also supported so Vercel Cron (which sends GET, authenticated via CRON_SECRET) can call this on a schedule.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const isCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runChecks();
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return runChecks();
}

async function runChecks() {
  await dbConnect();
  const rows = await Inventory.find({}).populate('product').lean();
  const stockByProduct = {};
  for (const row of rows) {
    const pid = row.product?._id?.toString();
    if (!pid) continue;
    const current =
      (row.opening || 0) + (row.purchased || 0) - (row.sold || 0) + (row.returned || 0) -
      (row.exchanged || 0) - (row.damaged || 0) - (row.consumables || 0);
    if (!stockByProduct[pid]) {
      stockByProduct[pid] = { id: pid, name: row.product.name, reorderLevel: row.product.reorderLevel ?? 5, stock: 0 };
    }
    stockByProduct[pid].stock += current;
  }

  let created = 0;
  for (const p of Object.values(stockByProduct)) {
    const type = p.stock <= 0 ? 'Out of Stock' : p.stock <= p.reorderLevel ? 'Low Stock' : null;
    if (!type) continue;
    const existing = await Alert.findOne({ type, relatedProduct: p.id, resolved: false });
    if (existing) continue;
    await Alert.create({
      type,
      message: `${p.name} is ${type === 'Out of Stock' ? 'out of stock' : `at ${p.stock} units (reorder level ${p.reorderLevel})`}`,
      severity: type === 'Out of Stock' ? 'critical' : 'warning',
      relatedProduct: p.id,
    });
    created += 1;
  }

  return NextResponse.json({ created });
}
