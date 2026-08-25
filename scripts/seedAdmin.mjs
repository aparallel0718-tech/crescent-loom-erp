// Run with: npm run seed
// Requires MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME in your env (.env.local)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    passwordHash: String,
    role: { type: String, default: 'admin' },
  },
  { timestamps: true }
);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  const { MONGODB_URI, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME } = process.env;
  if (!MONGODB_URI || !SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.error('Missing MONGODB_URI / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in your environment.');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const existing = await User.findOne({ email: SEED_ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    console.log('Admin user already exists:', existing.email);
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  const user = await User.create({
    name: SEED_ADMIN_NAME || 'Admin',
    email: SEED_ADMIN_EMAIL.toLowerCase(),
    passwordHash,
    role: 'admin',
  });
  console.log('Created admin user:', user.email);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
