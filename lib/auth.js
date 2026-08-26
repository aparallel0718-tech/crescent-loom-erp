import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { dbConnect } from './mongodb';
import User from '../models/User';

export const authOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
  console.log('LOGIN ATTEMPT:', credentials.email);
  await dbConnect();
  console.log('DB CONNECTED');
  const user = await User.findOne({ email: credentials.email.toLowerCase() });
  console.log('USER FOUND:', user ? user.email : 'NONE');
  if (!user) return null;
  const valid = await bcrypt.compare(credentials.password, user.passwordHash);
  console.log('PASSWORD VALID:', valid);
  if (!valid) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
},
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Role helper: which roles can access which section. Extend as needed.
export const ROLE_ACCESS = {
  admin: ['*'],
  manager: ['*'],
  staff: [
    'dashboard',
    'products',
    'inventory',
    'sales',
    'customers',
    'purchases',
    'suppliers',
    'shipping',
    'alerts',
  ], // staff cannot see marketing spend, expenses, P&L, users by default
};

export function canAccess(role, section) {
  if (!role) return false;
  const allowed = ROLE_ACCESS[role] || [];
  return allowed.includes('*') || allowed.includes(section);
}
