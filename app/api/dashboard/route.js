import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { dbConnect } from '../../../lib/mongodb';
import Sale from '../../../models/Sale';
import Expense from '../../../models/Expense';
import Shipment from '../../../models/Shipment';
import Inventory from '../../../models/Inventory';
import Product from '../../../models/Product';

function parseRange(searchParams) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = searchParams.get('from') ? new Date(searchParams.get('from')) : defaultFrom;
  const to = searchParams.get('to') ? new Date(searchParams.get('to')) : now;
  return { from, to };
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const { from, to } = parseRange(searchParams);
  const dateFilter = { orderDate: { $gte: from, $lte: to } };

  const sales = await Sale.find({ ...dateFilter, status: { $ne: 'Cancelled' } }).lean();

    const totalRevenue = sales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, it) => iSum + (it.qty || 0) * (it.sellingPrice || 0), 0),
    0
  );
  const totalDiscount = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
  const netSales = totalRevenue - totalDiscount;
  const cogs = sales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, it) => iSum + (it.qty || 0) * (it.costPrice || 0), 0),
    0
  );
  const grossProfit = netSales - cogs;
  const grossMarginPct = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const shipments = await Shipment.find({ dispatchDate: { $gte: from, $lte: to } }).lean();
  const shippingCost = shipments.reduce((sum, s) => sum + (s.shippingCost || 0), 0);

  const expenses = await Expense.find({ date: { $gte: from, $lte: to } }).lean();
  const marketingExpense = expenses.filter((e) => e.type === 'Marketing').reduce((s, e) => s + e.amount, 0);
  const operatingExpense = expenses.filter((e) => e.type === 'Operating').reduce((s, e) => s + e.amount, 0);
  const totalExpense = marketingExpense + operatingExpense + shippingCost;

  const netProfit = grossProfit - totalExpense;
  const netMarginPct = netSales > 0 ? (netProfit / netSales) * 100 : 0;
  const marketingPctOfRevenue = totalRevenue > 0 ? (marketingExpense / totalRevenue) * 100 : 0;

  // Best / worst sellers by units sold in range
    const byProduct = {};
  for (const s of sales) {
    for (const it of s.items) {
      const key = it.productName || 'Unknown';
      if (!byProduct[key]) byProduct[key] = { name: key, units: 0, revenue: 0 };
      byProduct[key].units += it.qty || 0;
      byProduct[key].revenue += (it.qty || 0) * (it.sellingPrice || 0);
    }
  }
  const ranked = Object.values(byProduct).sort((a, b) => b.units - a.units);
  const bestSellers = ranked.slice(0, 5);
  const worstSellers = ranked.slice(-5).reverse();

  // Low stock check across all inventory ledger rows (latest per product)
  const inventoryRows = await Inventory.find({}).populate('product').lean();
  const stockByProduct = {};
  for (const row of inventoryRows) {
    const pid = row.product?._id?.toString();
    if (!pid) continue;
    const current =
      (row.opening || 0) +
      (row.purchased || 0) -
      (row.sold || 0) +
      (row.returned || 0) -
      (row.exchanged || 0) -
      (row.damaged || 0) -
      (row.consumables || 0);
    if (!stockByProduct[pid]) {
      stockByProduct[pid] = { name: row.product.name, sku: row.product.sku, reorderLevel: row.product.reorderLevel, stock: 0 };
    }
    stockByProduct[pid].stock += current;
  }
  const lowStock = Object.values(stockByProduct).filter((p) => p.stock <= (p.reorderLevel ?? 5) && p.stock > 0);
  const outOfStock = Object.values(stockByProduct).filter((p) => p.stock <= 0);

  return NextResponse.json({
    range: { from, to },
    totalRevenue,
    totalDiscount,
    netSales,
    cogs,
    grossProfit,
    grossMarginPct,
    marketingExpense,
    operatingExpense,
    shippingCost,
    totalExpense,
    netProfit,
    netMarginPct,
    marketingPctOfRevenue,
    orderCount: sales.length,
    avgOrderValue: sales.length ? netSales / sales.length : 0,
    bestSellers,
    worstSellers,
    lowStock,
    outOfStock,
  });
}
