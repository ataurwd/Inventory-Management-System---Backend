import { Transaction } from './transaction.model';
import { Product } from '../products/product.model';
import mongoose from 'mongoose';

export interface CreateTransactionInput {
  type: 'sale' | 'restock' | 'waste';
  productId: string | mongoose.Types.ObjectId;
  batchNo: string;
  qty: number;
  unitPrice: number;
  total: number;
  performedBy: string | mongoose.Types.ObjectId;
  timestamp?: Date;
}

export async function createTransaction(data: CreateTransactionInput) {
  const transaction = new Transaction(data);
  await transaction.save();
  return transaction;
}

export async function getByProduct(productId: string) {
  return Transaction.find({ productId }).sort({ timestamp: -1 });
}

export interface TransactionFilters {
  type?: string;
  from?: string;
  to?: string;
  search?: string;
}

export async function getTransactions(filters: TransactionFilters, page: number = 1, limit: number = 20) {
  const query: any = {};

  if (filters.type) {
    query.type = filters.type;
  }

  if (filters.from || filters.to) {
    query.timestamp = {};
    if (filters.from) {
      query.timestamp.$gte = new Date(filters.from);
    }
    if (filters.to) {
      // Ensure the "to" date includes the full day if only date is passed
      const toDate = new Date(filters.to);
      if (filters.to.indexOf('T') === -1) {
        toDate.setHours(23, 59, 59, 999);
      }
      query.timestamp.$lte = toDate;
    }
  }

  if (filters.search) {
    // Lookup matching product ids first
    const matchedProducts = await Product.find({
      name: { $regex: filters.search, $options: 'i' }
    }).select('_id');
    const productIds = matchedProducts.map((p) => p._id);
    query.productId = { $in: productIds };
  }

  const skip = (page - 1) * limit;
  const total = await Transaction.countDocuments(query);
  
  const transactions = await Transaction.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('productId', 'name barcode unit')
    .populate('performedBy', 'name email');

  return {
    transactions,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getSummary(from?: string, to?: string) {
  const query: any = {};

  if (from || to) {
    query.timestamp = {};
    if (from) {
      query.timestamp.$gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      if (to.indexOf('T') === -1) {
        toDate.setHours(23, 59, 59, 999);
      }
      query.timestamp.$lte = toDate;
    }
  }

  const transactions = await Transaction.find(query).populate('productId', 'costPrice');

  let totalRevenue = 0;
  let totalCost = 0;
  const transactionCount = transactions.length;

  for (const t of transactions) {
    const product = t.productId as any;
    const costPrice = product ? product.costPrice : 0;

    if (t.type === 'sale') {
      totalRevenue += t.total;
      totalCost += t.qty * costPrice;
    }
  }

  const netProfit = totalRevenue - totalCost;

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    transactionCount,
  };
}

export async function getRevenueReport(from?: string, to?: string, groupBy: 'day' | 'week' = 'day') {
  const match: any = { type: 'sale' };
  if (from || to) {
    match.timestamp = {};
    if (from) match.timestamp.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      if (to.indexOf('T') === -1) {
        toDate.setHours(23, 59, 59, 999);
      }
      match.timestamp.$lte = toDate;
    }
  }

  const formatStr = groupBy === 'week' ? '%G-W%V' : '%Y-%m-%d';

  const aggregation = await Transaction.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { $dateToString: { format: formatStr, date: '$timestamp' } },
        revenue: { $sum: '$total' },
        cost: { $sum: { $multiply: ['$qty', { $ifNull: ['$product.costPrice', 0] }] } },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        revenue: { $round: ['$revenue', 2] },
        cost: { $round: ['$cost', 2] },
        profit: { $round: [{ $subtract: ['$revenue', '$cost'] }, 2] },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return aggregation;
}

export async function getWasteReport(from?: string, to?: string, groupBy: 'day' | 'week' = 'day') {
  const match: any = { type: 'waste' };
  if (from || to) {
    match.timestamp = {};
    if (from) match.timestamp.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      if (to.indexOf('T') === -1) {
        toDate.setHours(23, 59, 59, 999);
      }
      match.timestamp.$lte = toDate;
    }
  }

  const formatStr = groupBy === 'week' ? '%G-W%V' : '%Y-%m-%d';

  const aggregation = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: formatStr, date: '$timestamp' } },
        qty: { $sum: '$qty' },
        loss: { $sum: '$total' },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        qty: '$qty',
        loss: { $round: ['$loss', 2] },
      },
    },
    { $sort: { date: 1 } },
  ]);

  return aggregation;
}
