import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccess } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/mongodb';
import Purchase from '../../../../models/Purchase';
import { applyInventoryDelta } from '../../../../lib/inventorySync';

async function requireSession(section) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (section && !canAccess(session.user.role, section)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request, { params }) {
  const { error } = await requireSession('purchases');
  if (error) return error;
  await dbConnect();
  const item = await Purchase.findById(params.id).lean({ virtuals: true });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(request, { params }) {
  const { error } = await requireSession('purchases');
  if (error) return error;
  await dbConnect();
  const body = await request.json();
  try {
    const existing = await Purchase.findById(params.id);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await applyInventoryDelta(existing.items, 'purchased', -1);
    const updated = await Purchase.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    await applyInventoryDelta(body.items, 'purchased', 1);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireSession('purchases');
  if (error) return error;
  await dbConnect();
  const deleted = await Purchase.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await applyInventoryDelta(deleted.items, 'purchased', -1);
  return NextResponse.json({ success: true });
}