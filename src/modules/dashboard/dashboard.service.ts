import { Product } from '../products/product.model';
import { Transaction } from '../transactions/transaction.model';
import { getTotalStock } from '../products/product.service';
import { isExpiringSoon, daysUntilExpiry } from '../../utils/date.util';

export async function getStats() {
  // 1. Total products (not deleted)
  const totalProducts = await Product.countDocuments({ isDeleted: false });

  // 2. Today's revenue
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todaySales = await Transaction.find({
    type: 'sale',
    timestamp: { $gte: todayStart }
  });
  const todayRevenue = todaySales.reduce((sum, t) => sum + t.total, 0);

  // 3. Low stock, expiry counts, and inventory valuation
  const allProducts = await Product.find({ isDeleted: false });
  let totalLowStockAlerts = 0;
  let totalExpiryAlerts = 0;
  let inventoryValuation = 0;

  for (const p of allProducts) {
    const totalStock = getTotalStock(p);
    inventoryValuation += totalStock * p.costPrice;

    if (totalStock < p.safetyStockLevel) {
      totalLowStockAlerts++;
    }
    for (const b of p.batches) {
      if (isExpiringSoon(b.expiry_date, 15)) {
        totalExpiryAlerts++;
      }
    }
  }

  // 4. Weekly revenue and purchases (last 7 days, including today)
  const startOf7DaysAgo = new Date();
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
  startOf7DaysAgo.setHours(0, 0, 0, 0);

  const weeklySales = await Transaction.aggregate([
    {
      $match: {
        type: 'sale',
        timestamp: { $gte: startOf7DaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        revenue: { $sum: '$total' }
      }
    }
  ]);

  const weeklyRestocks = await Transaction.aggregate([
    {
      $match: {
        type: 'restock',
        timestamp: { $gte: startOf7DaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        expense: { $sum: '$total' }
      }
    }
  ]);

  const weeklyRevenueMap = new Map<string, number>();
  weeklySales.forEach((s) => {
    weeklyRevenueMap.set(s._id, s.revenue);
  });

  const weeklyExpenseMap = new Map<string, number>();
  weeklyRestocks.forEach((r) => {
    weeklyExpenseMap.set(r._id, r.expense);
  });

  const weeklyRevenue: { date: string; revenue: number }[] = [];
  const salesVsPurchases: { date: string; sales: number; purchases: number }[] = [];
  let total7DaysRevenue = 0;
  let total7DaysExpense = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    const rev = parseFloat((weeklyRevenueMap.get(dateStr) || 0).toFixed(2));
    const exp = parseFloat((weeklyExpenseMap.get(dateStr) || 0).toFixed(2));
    
    total7DaysRevenue += rev;
    total7DaysExpense += exp;

    weeklyRevenue.push({
      date: dateStr,
      revenue: rev,
    });

    salesVsPurchases.push({
      date: dateStr,
      sales: rev,
      purchases: exp,
    });
  }

  const profitOrLoss = parseFloat((total7DaysRevenue - total7DaysExpense).toFixed(2));

  // 5. Recent Transactions
  const recentTransactions = await Transaction.find()
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('productId', 'name category')
    .populate('performedBy', 'name role')
    .lean();

  // 6. Top Selling Products (Lifetime or 30 days? Let's do lifetime for now)
  const topSellingAggregation = await Transaction.aggregate([
    {
      $match: { type: 'sale' }
    },
    {
      $group: {
        _id: '$productId',
        totalQty: { $sum: '$qty' },
        totalRevenue: { $sum: '$total' }
      }
    },
    {
      $sort: { totalQty: -1 }
    },
    {
      $limit: 5
    }
  ]);

  const topSellingProducts = await Promise.all(
    topSellingAggregation.map(async (ts) => {
      const product = await Product.findById(ts._id).select('name category unit sellingPrice');
      return {
        productId: ts._id,
        name: product ? product.name : 'Unknown Product',
        category: product ? product.category : 'N/A',
        totalQty: ts.totalQty,
        totalRevenue: parseFloat(ts.totalRevenue.toFixed(2)),
      };
    })
  );

  return {
    totalProducts,
    todayRevenue: parseFloat(todayRevenue.toFixed(2)),
    totalLowStockAlerts,
    totalExpiryAlerts,
    inventoryValuation: parseFloat(inventoryValuation.toFixed(2)),
    weeklyRevenue,
    salesVsPurchases,
    profitOrLoss,
    recentTransactions,
    topSellingProducts,
  };
}

export async function getWasteRisk() {
  const products = await Product.find({ isDeleted: false });
  const result: any[] = [];

  for (const product of products) {
    for (const batch of product.batches) {
      const days = daysUntilExpiry(batch.expiry_date);
      if (days <= 30 && days >= 0) {
        let suggestion = 'Bundle promotion — pair with fast-moving item';
        if (days <= 7) {
          suggestion = 'BOGO — Buy 1 Get 1 Free';
        } else if (days <= 15) {
          suggestion = '25% clearance discount';
        }

        const estimatedLoss = parseFloat((batch.qty * product.costPrice).toFixed(2));

        result.push({
          productId: product._id,
          name: product.name,
          category: product.category,
          batchNo: batch.batch_no,
          qty: batch.qty,
          costPrice: product.costPrice,
          expiryDate: batch.expiry_date,
          daysRemaining: days,
          estimatedLoss,
          suggestion,
          risk: days <= 7 ? 'critical' : days <= 15 ? 'high' : 'medium'
        });
      }
    }
  }

  // Sort by daysRemaining ascending (soonest to expire first)
  return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
