import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccess } from '../../../lib/auth';
import { dbConnect } from '../../../lib/mongodb';
import Purchase from '../../../models/Purchase';
import { applyInventoryDelta } from '../../../lib/inventorySync';

async function requireSession(section) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (section && !canAccess(session.user.role, section)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

export async function GET(request) {
  const { error } = await requireSession('purchases');
  if (error) return error;
  await dbConnect();
  const items = await Purchase.find({}).sort({ createdAt: -1 }).lean({ virtuals: true });
  return NextResponse.json(items);
}

export async function POST(request) {
  const { error } = await requireSession('purchases');
  if (error) return error;
  await dbConnect();
  const body = await request.json();
  try {
    const created = await Purchase.create(body);
    await applyInventoryDelta(body.items, 'purchased', 1);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}