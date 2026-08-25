import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, canAccess } from './auth';
import { dbConnect } from './mongodb';

async function requireSession(section) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (section && !canAccess(session.user.role, section)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

// Builds a GET (list) + POST (create) handler for a Mongoose model.
export function makeListCreateHandler(Model, { section, populate } = {}) {
  return {
    async GET(request) {
      const { error } = await requireSession(section);
      if (error) return error;
      await dbConnect();
      let query = Model.find({}).sort({ createdAt: -1 });
      if (populate) query = query.populate(populate);
      const items = await query.lean({ virtuals: true });
      return NextResponse.json(items);
    },
    async POST(request) {
      const { error } = await requireSession(section);
      if (error) return error;
      await dbConnect();
      const body = await request.json();
      try {
        const created = await Model.create(body);
        return NextResponse.json(created, { status: 201 });
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    },
  };
}

// Builds GET (one) + PATCH (update) + DELETE for a Mongoose model, keyed by :id
export function makeItemHandler(Model, { section } = {}) {
  return {
    async GET(request, { params }) {
      const { error } = await requireSession(section);
      if (error) return error;
      await dbConnect();
      const item = await Model.findById(params.id).lean({ virtuals: true });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    },
    async PATCH(request, { params }) {
      const { error } = await requireSession(section);
      if (error) return error;
      await dbConnect();
      const body = await request.json();
      try {
        const updated = await Model.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(updated);
      } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    },
    async DELETE(request, { params }) {
      const { error } = await requireSession(section);
      if (error) return error;
      await dbConnect();
      const deleted = await Model.findByIdAndDelete(params.id);
      if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    },
  };
}
