import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '../../../lib/auth';
import { dbConnect } from '../../../lib/mongodb';
import User from '../../../models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await dbConnect();
  const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
  return NextResponse.json(users);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await dbConnect();
  const body = await request.json();
  if (!body.password || body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  try {
    const passwordHash = await bcrypt.hash(body.password, 10);
    const created = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      role: body.role || 'staff',
      passwordHash,
    });
    const { passwordHash: _omit, ...safe } = created.toObject();
    return NextResponse.json(safe, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
