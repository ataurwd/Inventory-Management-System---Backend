import { IBatch } from '../modules/products/product.model';

/**
 * Sort batches by expiry date in ascending order (oldest/soonest-to-expire first).
 * This is the core of FIFO: First-Expiry, First-Out.
 */
export function sortBatchesByExpiry(batches: IBatch[]): IBatch[] {
  return [...batches].sort(
    (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );
}

export interface DeductionResult {
  updated: IBatch[];
  deducted: { batchNo: string; qty: number }[];
}

/**
 * Deduct a given quantity from batches using FIFO (oldest expiry first).
 * Removes batches whose qty reaches 0.
 * Throws if total available qty is insufficient.
 */
export function deductFromBatches(batches: IBatch[], qty: number): DeductionResult {
  const sorted = sortBatchesByExpiry(batches);
  let remaining = qty;
  const deducted: { batchNo: string; qty: number }[] = [];

  for (const batch of sorted) {
    if (remaining <= 0) break;

    const take = Math.min(batch.qty, remaining);
    batch.qty -= take;
    remaining -= take;
    deducted.push({ batchNo: batch.batch_no, qty: take });
  }

  if (remaining > 0) {
    throw new Error('Insufficient stock');
  }

  // Filter out batches with 0 quantity
  const updated = sorted.filter((b) => b.qty > 0);

  return { updated, deducted };
}

/**
 * Calculate total quantity across all batches.
 */
export function getTotalQty(batches: IBatch[]): number {
  return batches.reduce((sum, batch) => sum + batch.qty, 0);
}
