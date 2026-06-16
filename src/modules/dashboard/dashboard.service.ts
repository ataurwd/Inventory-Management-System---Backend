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

  // 3. Low stock and expiry counts
  const allProducts = await Product.find({ isDeleted: false });
  let totalLowStockAlerts = 0;
  let totalExpiryAlerts = 0;

  for (const p of allProducts) {
    const totalStock = getTotalStock(p);
    if (totalStock < p.safetyStockLevel) {
      totalLowStockAlerts++;
    }
    for (const b of p.batches) {
      if (isExpiringSoon(b.expiry_date, 15)) {
        totalExpiryAlerts++;
      }
    }
  }

  // 4. Weekly revenue (last 7 days, including today)
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

  const weeklyRevenueMap = new Map<string, number>();
  weeklySales.forEach((s) => {
    weeklyRevenueMap.set(s._id, s.revenue);
  });

  const weeklyRevenue: { date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    weeklyRevenue.push({
      date: dateStr,
      revenue: parseFloat((weeklyRevenueMap.get(dateStr) || 0).toFixed(2)),
    });
  }

  return {
    totalProducts,
    todayRevenue: parseFloat(todayRevenue.toFixed(2)),
    totalLowStockAlerts,
    totalExpiryAlerts,
    weeklyRevenue
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
