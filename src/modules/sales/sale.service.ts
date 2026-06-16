import { Sale, ISale } from './sale.model';
import { Product } from '../products/product.model';
import { Transaction } from '../transactions/transaction.model';
import { createTransaction } from '../transactions/transaction.service';
import { ApiError } from '../../utils/api-error.util';
import * as fifoUtil from '../../utils/fifo.util';
import { getTotalStock } from '../products/product.service';
import { emitToRole } from '../../sockets/notification.emitter';
import { SocketEvents } from '../../sockets/events';
import mongoose from 'mongoose';
import { CreateSaleInput, UpdateSaleInput } from './sale.validation';

// Helper to format currency
const formatNum = (num: number) => parseFloat(num.toFixed(2));

/**
 * Generate a unique readable invoice number: INV-YYYYMMDD-XXXX
 */
function generateInvoiceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `INV-${dateStr}-${randomStr}`;
}

export async function createSale(data: CreateSaleInput, userId: string) {
  // 1. Calculate subtotal and grandTotal
  let subtotal = 0;
  for (const item of data.products) {
    subtotal += item.qty * item.unitPrice;
  }
  subtotal = formatNum(subtotal);
  const discount = formatNum(data.discount || 0);
  const tax = formatNum(data.tax || 0);
  const grandTotal = formatNum(Math.max(0, subtotal - discount + tax));
  const paidAmount = formatNum(data.paidAmount || 0);
  const dueAmount = formatNum(Math.max(0, grandTotal - paidAmount));

  // Determine payment status
  let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
  if (paidAmount >= grandTotal) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'partial';
  }

  // 2. Setup initial sale document
  const saleId = new mongoose.Types.ObjectId();
  const invoiceNumber = generateInvoiceNumber();

  const saleProducts: any[] = [];

  // 3. Process stock deductions if status is completed
  if (data.saleStatus === 'completed') {
    for (const item of data.products) {
      const product = await Product.findOne({ _id: item.productId, isDeleted: false });
      if (!product) {
        throw ApiError.badRequest(`Product with ID ${item.productId} not found`);
      }

      // Check stock before try to deduct
      const currentStock = getTotalStock(product);
      if (currentStock < item.qty) {
        throw ApiError.badRequest(`Insufficient stock for product: ${product.name}. Available: ${currentStock}, Requested: ${item.qty}`);
      }

      // Keep expiry dates for transactions
      const batchExpiryMap = new Map<string, Date>();
      for (const b of product.batches) {
        batchExpiryMap.set(b.batch_no, b.expiry_date);
      }

      // Deduct from batches using FIFO
      const sortedBatches = fifoUtil.sortBatchesByExpiry(product.batches);
      const { updated, deducted } = fifoUtil.deductFromBatches(sortedBatches, item.qty);

      product.batches = updated;
      await product.save();

      const soldBatches = deducted.map((d) => ({
        batchNo: d.batchNo,
        qty: d.qty,
        expiryDate: batchExpiryMap.get(d.batchNo) || new Date(),
      }));

      // Add to sale products array
      saleProducts.push({
        productId: product._id,
        name: product.name,
        barcode: product.barcode,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: formatNum(item.qty * item.unitPrice),
        batches: soldBatches,
      });

      // Create transaction logs
      for (const d of deducted) {
        const expiry = batchExpiryMap.get(d.batchNo);
        await createTransaction({
          type: 'sale',
          productId: product._id,
          batchNo: d.batchNo,
          qty: d.qty,
          unitPrice: item.unitPrice,
          total: formatNum(d.qty * item.unitPrice),
          performedBy: userId,
          saleId,
          expiryDate: expiry,
        });
      }

      // Emit low stock alert if applicable
      const newStock = getTotalStock(product);
      if (newStock < product.safetyStockLevel) {
        const payload = {
          productId: product._id,
          name: product.name,
          currentQty: newStock,
          safetyLevel: product.safetyStockLevel,
        };
        emitToRole('admin', SocketEvents.LOW_STOCK_ALERT, payload);
        emitToRole('manager', SocketEvents.LOW_STOCK_ALERT, payload);
      }
    }
  } else {
    // Draft or other status without active stock movements
    for (const item of data.products) {
      saleProducts.push({
        productId: new mongoose.Types.ObjectId(item.productId),
        name: item.name,
        barcode: item.barcode,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: formatNum(item.qty * item.unitPrice),
        batches: [],
      });
    }
  }

  // Create Sale record
  const sale = new Sale({
    _id: saleId,
    invoiceNumber,
    saleDate: new Date(),
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    products: saleProducts,
    subtotal,
    discount,
    tax,
    grandTotal,
    paidAmount,
    dueAmount,
    paymentStatus,
    saleStatus: data.saleStatus,
    paymentMethod: data.paymentMethod,
    notes: data.notes,
    createdBy: new mongoose.Types.ObjectId(userId),
  });

  await sale.save();
  return sale;
}

export async function getSales(filters: any, page: number = 1, limit: number = 20) {
  const query: any = {};

  if (filters.invoiceNumber) {
    query.invoiceNumber = { $regex: filters.invoiceNumber, $options: 'i' };
  }

  if (filters.customer) {
    query.customerName = { $regex: filters.customer, $options: 'i' };
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.saleStatus) {
    query.saleStatus = filters.saleStatus;
  }

  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  if (filters.from || filters.to) {
    query.saleDate = {};
    if (filters.from) {
      query.saleDate.$gte = new Date(filters.from);
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      if (filters.to.indexOf('T') === -1) {
        toDate.setHours(23, 59, 59, 999);
      }
      query.saleDate.$lte = toDate;
    }
  }

  if (filters.product) {
    query['products.name'] = { $regex: filters.product, $options: 'i' };
  }

  const skip = (page - 1) * limit;
  const total = await Sale.countDocuments(query);

  const sales = await Sale.find(query)
    .sort({ saleDate: -1 })
    .skip(skip)
    .limit(limit)
    .populate('createdBy', 'name email');

  return {
    sales,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getSaleById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid Sale ID');
  }

  const sale = await Sale.findById(id).populate('createdBy', 'name email');
  if (!sale) {
    throw ApiError.notFound('Sale record not found');
  }
  return sale;
}

export async function updateSale(id: string, data: UpdateSaleInput, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid Sale ID');
  }

  const sale = await Sale.findById(id);
  if (!sale) {
    throw ApiError.notFound('Sale record not found');
  }

  const prevStatus = sale.saleStatus;
  const newStatus = data.saleStatus !== undefined ? data.saleStatus : prevStatus;

  // Determine if product or quantities updates are provided
  const hasProductsUpdate = data.products !== undefined;
  const finalProducts = hasProductsUpdate ? data.products! : sale.products;

  // 1. Stock Adjustment Strategy using Memory-Simulated dry run
  // This guarantees we only modify the database if the entire operation succeeds.
  if (prevStatus === 'completed' || newStatus === 'completed') {
    // Collect all affected products
    const productIdsSet = new Set<string>();
    if (prevStatus === 'completed') {
      sale.products.forEach((p) => productIdsSet.add(p.productId.toString()));
    }
    if (newStatus === 'completed') {
      finalProducts.forEach((p) => productIdsSet.add(p.productId.toString()));
    }

    // Load original products
    const productsMap = new Map<string, any>();
    for (const pId of productIdsSet) {
      const prod = await Product.findOne({ _id: pId, isDeleted: false });
      if (!prod) {
        throw ApiError.badRequest(`Product with ID ${pId} not found or has been deleted`);
      }
      productsMap.set(pId, prod);
    }

    // Clone batches in memory for simulation
    const simulatedBatchesMap = new Map<string, any[]>();
    for (const [pId, prod] of productsMap.entries()) {
      simulatedBatchesMap.set(pId, JSON.parse(JSON.stringify(prod.batches)));
    }

    // Phase 1: Revert old completed sale stock in memory
    if (prevStatus === 'completed') {
      for (const item of sale.products) {
        const batches = simulatedBatchesMap.get(item.productId.toString())!;
        for (const oldBatch of item.batches) {
          const matchedBatch = batches.find((b) => b.batch_no === oldBatch.batchNo);
          if (matchedBatch) {
            matchedBatch.qty += oldBatch.qty;
          } else {
            // Re-create batch
            batches.push({
              batch_no: oldBatch.batchNo,
              qty: oldBatch.qty,
              expiry_date: oldBatch.expiryDate,
            });
          }
        }
      }
    }

    // Phase 2: Deduct new completed sale stock in memory
    const finalSoldBatchesMap = new Map<string, any[]>();
    if (newStatus === 'completed') {
      for (const item of finalProducts) {
        const batches = simulatedBatchesMap.get(item.productId.toString())!;
        const totalQty = batches.reduce((sum, b) => sum + b.qty, 0);
        if (totalQty < item.qty) {
          throw ApiError.badRequest(`Insufficient stock for product: ${item.name || 'Selected Item'}. Available after reversion: ${totalQty}, Requested: ${item.qty}`);
        }

        // Apply FIFO deduction to memory clone
        const sorted = [...batches].sort(
          (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
        );
        let remaining = item.qty;
        const deducted: any[] = [];

        for (const batch of sorted) {
          if (remaining <= 0) break;
          const take = Math.min(batch.qty, remaining);
          batch.qty -= take;
          remaining -= take;
          deducted.push({
            batchNo: batch.batch_no,
            qty: take,
            expiryDate: new Date(batch.expiry_date),
          });
        }

        // Update map with filtered non-zero batches
        simulatedBatchesMap.set(item.productId.toString(), sorted.filter((b) => b.qty > 0));
        finalSoldBatchesMap.set(item.productId.toString() + '_' + item.qty + '_' + item.unitPrice, deducted);
      }
    }

    // Dry-run complete. Now persist to DB and emit events.
    
    // Save updated products
    for (const [pId, updatedBatches] of simulatedBatchesMap.entries()) {
      const prod = productsMap.get(pId)!;
      prod.batches = updatedBatches;
      await prod.save();
    }

    // Clean old transactions if previous was completed
    if (prevStatus === 'completed') {
      await Transaction.deleteMany({ saleId: sale._id });
    }

    // Create new transactions if status is completed
    if (newStatus === 'completed') {
      for (const item of finalProducts) {
        const key = item.productId.toString() + '_' + item.qty + '_' + item.unitPrice;
        const deducted = finalSoldBatchesMap.get(key) || [];
        
        for (const d of deducted) {
          await createTransaction({
            type: 'sale',
            productId: item.productId,
            batchNo: d.batchNo,
            qty: d.qty,
            unitPrice: item.unitPrice,
            total: formatNum(d.qty * item.unitPrice),
            performedBy: userId,
            saleId: sale._id,
            expiryDate: d.expiryDate,
          });
        }

        // Socket warning alerts if low stock
        const prod = productsMap.get(item.productId.toString())!;
        const stockAfter = getTotalStock(prod);
        if (stockAfter < prod.safetyStockLevel) {
          const payload = {
            productId: prod._id,
            name: prod.name,
            currentQty: stockAfter,
            safetyLevel: prod.safetyStockLevel,
          };
          emitToRole('admin', SocketEvents.LOW_STOCK_ALERT, payload);
          emitToRole('manager', SocketEvents.LOW_STOCK_ALERT, payload);
        }
      }
    }

    // Map new product lines with final batch references
    if (hasProductsUpdate || prevStatus !== newStatus) {
      const newProductsArray: any[] = [];
      for (const item of finalProducts) {
        const key = item.productId.toString() + '_' + item.qty + '_' + item.unitPrice;
        const batches = newStatus === 'completed' ? (finalSoldBatchesMap.get(key) || []) : [];
        newProductsArray.push({
          productId: new mongoose.Types.ObjectId(item.productId),
          name: item.name,
          barcode: item.barcode,
          qty: item.qty,
          unitPrice: item.unitPrice,
          total: formatNum(item.qty * item.unitPrice),
          batches,
        });
      }
      sale.products = newProductsArray;
    }
  } else {
    // If neither prev nor new status is completed, just update product specs directly (no stock movements)
    if (hasProductsUpdate) {
      sale.products = finalProducts.map((p: any) => ({
        productId: new mongoose.Types.ObjectId(p.productId),
        name: p.name,
        barcode: p.barcode,
        qty: p.qty,
        unitPrice: p.unitPrice,
        total: formatNum(p.qty * p.unitPrice),
        batches: [],
      }));
    }
  }

  // 2. Perform updates to basic fields
  if (data.customerName !== undefined) sale.customerName = data.customerName;
  if (data.customerPhone !== undefined) sale.customerPhone = data.customerPhone;
  if (data.saleStatus !== undefined) sale.saleStatus = data.saleStatus;
  if (data.paymentMethod !== undefined) sale.paymentMethod = data.paymentMethod;
  if (data.notes !== undefined) sale.notes = data.notes;
  if (data.discount !== undefined) sale.discount = formatNum(data.discount);
  if (data.tax !== undefined) sale.tax = formatNum(data.tax);

  // Re-calculate math based on final products array
  let subtotal = 0;
  for (const item of sale.products) {
    subtotal += item.qty * item.unitPrice;
  }
  sale.subtotal = formatNum(subtotal);
  sale.grandTotal = formatNum(Math.max(0, sale.subtotal - sale.discount + sale.tax));

  if (data.paidAmount !== undefined) {
    sale.paidAmount = formatNum(data.paidAmount);
  }
  sale.dueAmount = formatNum(Math.max(0, sale.grandTotal - sale.paidAmount));

  // Update payment status
  if (sale.paidAmount >= sale.grandTotal) {
    sale.paymentStatus = 'paid';
  } else if (sale.paidAmount > 0) {
    sale.paymentStatus = 'partial';
  } else {
    sale.paymentStatus = 'unpaid';
  }

  await sale.save();
  return sale;
}

export async function deleteSale(id: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest('Invalid Sale ID');
  }

  const sale = await Sale.findById(id);
  if (!sale) {
    throw ApiError.notFound('Sale record not found');
  }

  // If sale was completed, revert the stock levels first
  if (sale.saleStatus === 'completed') {
    for (const item of sale.products) {
      const product = await Product.findOne({ _id: item.productId, isDeleted: false });
      if (product) {
        for (const oldBatch of item.batches) {
          const matchedBatch = product.batches.find((b) => b.batch_no === oldBatch.batchNo);
          if (matchedBatch) {
            matchedBatch.qty += oldBatch.qty;
          } else {
            product.batches.push({
              batch_no: oldBatch.batchNo,
              qty: oldBatch.qty,
              expiry_date: oldBatch.expiryDate,
            });
          }
        }
        await product.save();
      }
    }
    // Delete associated transactions
    await Transaction.deleteMany({ saleId: sale._id });
  }

  await Sale.findByIdAndDelete(id);
  return { success: true, message: 'Sale deleted successfully' };
}
