import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '../../../../lib/auth';
import { dbConnect } from '../../../../lib/mongodb';
import User from '../../../../models/User';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function PATCH(request, { params }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  await dbConnect();
  const body = await request.json();
  const update = { name: body.name, role: body.role, email: body.email?.toLowerCase() };
  if (body.password) {
    update.passwordHash = await bcrypt.hash(body.password, 10);
  }
  const updated = await User.findByIdAndUpdate(params.id, update, { new: true, runValidators: true }, '-passwordHash');
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { passwordHash, ...safe } = updated.toObject();
  return NextResponse.json(safe);
}

export async function DELETE(request, { params }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  await dbConnect();
  const deleted = await User.findByIdAndDelete(params.id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
