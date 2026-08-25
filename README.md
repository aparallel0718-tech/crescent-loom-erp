# Crescent Loom — Business OS

A standalone internal dashboard for Crescent Loom covering: Business Dashboard, Products & Styles,
Inventory, Sales, Customers, Purchases, Suppliers, Shipping & Logistics, Marketing Expense,
Operating Expenses, Profit & Loss, Analytics, and Alerts & Notifications — with role-based
access (Admin / Manager / Staff).

**Stack:** Next.js 14 (App Router) · MongoDB (Atlas) via Mongoose · NextAuth (credentials login) ·
Tailwind CSS · deployed on Vercel. Separate from the crescentloom.com storefront — its own repo, its own database.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:
- `MONGODB_URI` — from MongoDB Atlas (step 2 below)
- `NEXTAUTH_SECRET` — any long random string, e.g. run `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` — your first admin login

Create your admin user:
```bash
npm run seed
```

Run locally:
```bash
npm run dev
```
Visit `http://localhost:3000`, log in with the admin credentials you set.

---

## 2. MongoDB Atlas (free tier is enough to start)

1. Create a free account at mongodb.com/cloud/atlas and a free M0 cluster.
2. Database Access → add a user with a strong password.
3. Network Access → allow access from anywhere (`0.0.0.0/0`) — required since Vercel's IPs are dynamic.
4. Connect → Drivers → copy the connection string, replace `<password>` and add a database name,
   e.g. `.../crescent-loom-erp?retryWrites=true&w=majority`. That's your `MONGODB_URI`.

---

## 3. Push to GitHub

```bash
cd crescent-loom-erp
git init
git add .
git commit -m "Initial commit: Crescent Loom Business OS"
git branch -M main
git remote add origin https://github.com/<your-username>/crescent-loom-erp.git
git push -u origin main
```
(Create the empty repo on GitHub first — github.com/new.)

---

## 4. Deploy to Vercel

1. Go to vercel.com → Add New → Project → import the GitHub repo you just pushed.
2. Framework preset: Next.js (auto-detected). Leave build settings default.
3. Add environment variables (Project Settings → Environment Variables):
   - `MONGODB_URI`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` — set this to your production URL, e.g. `https://crescent-loom-erp.vercel.app`
   - `CRON_SECRET` — any random string, used to authenticate the scheduled stock-check (optional but recommended)
4. Deploy.
5. Since `npm run seed` needs your local machine's env to talk to the same Atlas cluster, you can run
   it locally pointed at the production `MONGODB_URI` to create your first admin — or temporarily set
   the same env vars in `.env.local` and run `npm run seed` once.

The `vercel.json` in this repo already schedules a daily stock-check
(`/api/alerts/run-checks`) at 3am — Vercel Cron calls it automatically once deployed
(available on Vercel's free Hobby plan, one cron job).

---

## 5. Roles

- **Admin / Manager** — full access to every module, including financials and Team & Access.
- **Staff** — Dashboard, Products, Inventory, Sales, Customers, Purchases, Suppliers, Shipping,
  Alerts. Marketing spend, Operating Expenses, P&L, and Team & Access are hidden and blocked
  at the API level too (not just hidden in the UI).

Change what each role can see in `lib/auth.js` (`ROLE_ACCESS`) and `components/Sidebar.jsx`
(`ROLE_SECTIONS`) — both need to stay in sync since the sidebar hides links but the API layer
is the actual enforcement.

Manage team members from **Team & Access** (admin only) once logged in — no need to touch the
database directly.

---

## 6. How the numbers are calculated

All defined in `app/api/dashboard/route.js`:
- **Net Sales** = Σ(qty × sellingPrice) − Σ(discount), for non-cancelled sales in the selected range
- **COGS** = Σ(qty × costPrice) from each sale's recorded cost price
- **Gross Profit** = Net Sales − COGS · **Gross Margin %** = Gross Profit / Net Sales
- **Total Expenses** = Marketing + Operating + Shipping cost, for the same range
- **Net Profit** = Gross Profit − Total Expenses · **Net Margin %** = Net Profit / Net Sales
- **Current Stock** per product = Opening + Purchased − Sold + Returned − Exchanged − Damaged − Consumables
  (see `models/Inventory.js`), aggregated across all inventory ledger rows for that product.

Enter a `costPrice` on each Sale (defaults from the product's costing if you copy it over) so
gross margin is accurate — this is deliberately per-sale rather than always pulling live from the
product record, so historical margins stay correct even if you update product costing later.

---

## 7. Extending it

Every module (Products, Sales, Inventory, etc.) is powered by one reusable component,
`components/CrudPage.jsx`, driven by a small config object (columns + form fields) in each
page file under `app/(dashboard)/<module>/page.js`. To add a field to any module: add it to the
Mongoose model in `models/`, then add one line to that module's `columns` and `formFields` arrays.
No new API code needed — the CRUD API routes are generated generically from
`lib/crudHandlers.js`.

To add a brand-new module: create a model, an `app/api/<name>/route.js` +
`app/api/<name>/[id]/route.js` pair using `makeListCreateHandler` / `makeItemHandler`
(copy any existing pair), a page using `CrudPage`, and a line in `components/Sidebar.jsx`.
