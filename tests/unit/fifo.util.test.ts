import { sortBatchesByExpiry, deductFromBatches, getTotalQty } from '../../src/utils/fifo.util';
import { IBatch } from '../../src/modules/products/product.model';

// Helper to create batch objects matching the IBatch interface
function makeBatch(batch_no: string, qty: number, expiryDaysFromNow: number): IBatch {
  const date = new Date();
  date.setDate(date.getDate() + expiryDaysFromNow);
  return { batch_no, qty, expiry_date: date };
}

describe('FIFO Utility — sortBatchesByExpiry', () => {
  it('should sort batches by expiry date ascending (oldest first)', () => {
    const batches: IBatch[] = [
      makeBatch('B3', 10, 30),
      makeBatch('B1', 5, 5),
      makeBatch('B2', 8, 15),
    ];

    const sorted = sortBatchesByExpiry(batches);

    expect(sorted[0].batch_no).toBe('B1');
    expect(sorted[1].batch_no).toBe('B2');
    expect(sorted[2].batch_no).toBe('B3');
  });

  it('should not mutate the original array', () => {
    const batches: IBatch[] = [
      makeBatch('B2', 10, 30),
      makeBatch('B1', 5, 5),
    ];

    const sorted = sortBatchesByExpiry(batches);

    expect(batches[0].batch_no).toBe('B2'); // original unchanged
    expect(sorted[0].batch_no).toBe('B1');
  });

  it('should handle empty array', () => {
    expect(sortBatchesByExpiry([])).toEqual([]);
  });

  it('should handle single batch', () => {
    const batches = [makeBatch('B1', 5, 10)];
    const sorted = sortBatchesByExpiry(batches);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].batch_no).toBe('B1');
  });
});

describe('FIFO Utility — deductFromBatches', () => {
  it('should deduct from the oldest batch first', () => {
    const batches: IBatch[] = [
      makeBatch('B2', 10, 30),
      makeBatch('B1', 5, 5),  // oldest expiry
    ];

    const result = deductFromBatches(batches, 3);

    expect(result.deducted).toEqual([{ batchNo: 'B1', qty: 3 }]);
    // B1 should have 2 remaining, B2 should be untouched
    expect(result.updated.find((b) => b.batch_no === 'B1')?.qty).toBe(2);
    expect(result.updated.find((b) => b.batch_no === 'B2')?.qty).toBe(10);
  });

  it('should remove a batch when its qty reaches 0', () => {
    const batches: IBatch[] = [
      makeBatch('B1', 5, 5),
      makeBatch('B2', 10, 30),
    ];

    const result = deductFromBatches(batches, 5);

    expect(result.deducted).toEqual([{ batchNo: 'B1', qty: 5 }]);
    // B1 should be removed (qty = 0)
    expect(result.updated.find((b) => b.batch_no === 'B1')).toBeUndefined();
    expect(result.updated).toHaveLength(1);
    expect(result.updated[0].batch_no).toBe('B2');
  });

  it('should span multiple batches when needed', () => {
    const batches: IBatch[] = [
      makeBatch('B1', 3, 5),
      makeBatch('B2', 4, 15),
      makeBatch('B3', 10, 30),
    ];

    const result = deductFromBatches(batches, 6);

    expect(result.deducted).toEqual([
      { batchNo: 'B1', qty: 3 },
      { batchNo: 'B2', qty: 3 },
    ]);
    // B1 removed (qty 0), B2 has 1 left, B3 untouched
    expect(result.updated.find((b) => b.batch_no === 'B1')).toBeUndefined();
    expect(result.updated.find((b) => b.batch_no === 'B2')?.qty).toBe(1);
    expect(result.updated.find((b) => b.batch_no === 'B3')?.qty).toBe(10);
  });

  it('should deduct all batches when qty equals total', () => {
    const batches: IBatch[] = [
      makeBatch('B1', 3, 5),
      makeBatch('B2', 7, 15),
    ];

    const result = deductFromBatches(batches, 10);

    expect(result.deducted).toEqual([
      { batchNo: 'B1', qty: 3 },
      { batchNo: 'B2', qty: 7 },
    ]);
    expect(result.updated).toHaveLength(0);
  });

  it('should throw when qty exceeds total available stock', () => {
    const batches: IBatch[] = [
      makeBatch('B1', 3, 5),
      makeBatch('B2', 4, 15),
    ];

    expect(() => deductFromBatches(batches, 10)).toThrow('Insufficient stock');
  });

  it('should throw on empty batches with qty > 0', () => {
    expect(() => deductFromBatches([], 1)).toThrow('Insufficient stock');
  });
});

describe('FIFO Utility — getTotalQty', () => {
  it('should sum all batch quantities', () => {
    const batches: IBatch[] = [
      makeBatch('B1', 5, 10),
      makeBatch('B2', 10, 20),
      makeBatch('B3', 3, 30),
    ];

    expect(getTotalQty(batches)).toBe(18);
  });

  it('should return 0 for empty batches', () => {
    expect(getTotalQty([])).toBe(0);
  });

  it('should handle single batch', () => {
    expect(getTotalQty([makeBatch('B1', 42, 10)])).toBe(42);
  });
});
