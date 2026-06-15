import mongoose from 'mongoose';
import { Product } from '../products/product.model';
import { ApiError } from '../../utils/api-error.util';
import * as fifoUtil from '../../utils/fifo.util';
import { createTransaction } from '../transactions/transaction.service';
import { isExpiringSoon, daysUntilExpiry } from '../../utils/date.util';
import { getTotalStock } from '../products/product.service';

import { emitToRole } from '../../sockets/notification.emitter';
import { SocketEvents } from '../../sockets/events';

export async function scanSell(barcode: string, qty: number, userId: string) {
  // 1. Find product by barcode
  const product = await Product.findOne({ barcode, isDeleted: false });
  if (!product) {
    throw ApiError.notFound('Product with this barcode not found');
  }

  // 2. Sort batches by expiry ASC
  const sortedBatches = fifoUtil.sortBatchesByExpiry(product.batches);

  // 3. Check total stock before trying to deduct
  const totalStock = fifoUtil.getTotalQty(sortedBatches);
  if (totalStock < qty) {
    throw ApiError.badRequest('Insufficient stock');
  }

  // 4. Deduct from batches
  const { updated, deducted } = fifoUtil.deductFromBatches(sortedBatches, qty);

  // 5. Update product batches in DB
  product.batches = updated;
  await product.save();

  // 6. Create Transaction docs for each deducted batch
  const transactions = [];
  for (const item of deducted) {
    const total = item.qty * product.sellingPrice;
    const transaction = await createTransaction({
      type: 'sale',
      productId: product._id,
      batchNo: item.batchNo,
      qty: item.qty,
      unitPrice: product.sellingPrice,
      total,
      performedBy: userId,
    });
    transactions.push(transaction);
  }

  // 7. Check if total stock is below safetyStockLevel
  const newTotalStock = getTotalStock(product);
  const lowStockAlert = newTotalStock < product.safetyStockLevel;

  if (lowStockAlert) {
    emitToRole('admin', SocketEvents.LOW_STOCK_ALERT, {
      productId: product._id,
      name: product.name,
      currentQty: newTotalStock,
      safetyLevel: product.safetyStockLevel,
    });
    emitToRole('manager', SocketEvents.LOW_STOCK_ALERT, {
      productId: product._id,
      name: product.name,
      currentQty: newTotalStock,
      safetyLevel: product.safetyStockLevel,
    });
  }

  return {
    success: true,
    transactions,
    lowStockAlert,
    product: {
      id: product._id,
      name: product.name,
      totalStock: newTotalStock,
      safetyStockLevel: product.safetyStockLevel,
    }
  };
}

export async function getLowStock() {
  const products = await Product.find({ isDeleted: false });
  return products
    .filter((p) => getTotalStock(p) < p.safetyStockLevel)
    .map((p) => ({
      _id: p._id,
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      unit: p.unit,
      totalStock: getTotalStock(p),
      safetyStockLevel: p.safetyStockLevel,
    }));
}

export async function getExpiryAlerts(daysThreshold: number = 15) {
  const products = await Product.find({ isDeleted: false });
  const alerts: any[] = [];
  
  for (const product of products) {
    for (const batch of product.batches) {
      if (isExpiringSoon(batch.expiry_date, daysThreshold)) {
        alerts.push({
          productId: product._id,
          productName: product.name,
          barcode: product.barcode,
          batchNo: batch.batch_no,
          qty: batch.qty,
          expiryDate: batch.expiry_date,
          daysRemaining: daysUntilExpiry(batch.expiry_date),
        });
      }
    }
  }
  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
