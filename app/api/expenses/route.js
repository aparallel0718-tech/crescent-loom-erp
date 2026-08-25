import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccess } from '../../../lib/auth';
import { dbConnect } from '../../../lib/mongodb';
import Expense from '../../../models/Expense';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'Marketing' | 'Operating' | null
  const section = type === 'Marketing' ? 'marketing' : 'expenses';
  if (!canAccess(session.user.role, section)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await dbConnect();
  const filter = type ? { type } : {};
  const items = await Expense.find(filter).sort({ date: -1 });
  return NextResponse.json(items);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await dbConnect();
  const body = await request.json();
  const section = body.type === 'Marketing' ? 'marketing' : 'expenses';
  if (!canAccess(session.user.role, section)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const created = await Expense.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
