import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { runExpiryAlertJob } from '../../src/jobs/expiry-alert.job';
import { Product } from '../../src/modules/products/product.model';
import * as emitter from '../../src/sockets/notification.emitter';
import * as dateUtil from '../../src/utils/date.util';

jest.mock('../../src/modules/products/product.model');
jest.mock('../../src/sockets/notification.emitter');
jest.mock('../../src/utils/date.util');

describe('Expiry Alert Cron Job Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should scan products and emit alerts for near-expiry batches', async () => {
    jest.mocked(dateUtil.daysUntilExpiry).mockImplementation((date: Date) => {
      if (date.getTime() === 1000) return 5;
      if (date.getTime() === 2000) return 40;
      return -1;
    });

    const mockProducts = [
      {
        _id: 'prod1',
        name: 'Expiring Milk',
        batches: [
          { batch_no: 'B1', expiry_date: new Date(1000) }
        ]
      },
      {
        _id: 'prod2',
        name: 'Good Milk',
        batches: [
          { batch_no: 'B2', expiry_date: new Date(2000) }
        ]
      }
    ];

    jest.mocked(Product.find).mockResolvedValue(mockProducts);

    await runExpiryAlertJob();

    expect(Product.find).toHaveBeenCalledWith({ isDeleted: false });
    
    expect(emitter.emitToRole).toHaveBeenCalledTimes(2);
    expect(emitter.emitToRole).toHaveBeenCalledWith('admin', 'EXPIRY_ALERT', {
      productId: 'prod1',
      name: 'Expiring Milk',
      batchNo: 'B1',
      daysToExpiry: 5,
    });
    expect(emitter.emitToRole).toHaveBeenCalledWith('manager', 'EXPIRY_ALERT', {
      productId: 'prod1',
      name: 'Expiring Milk',
      batchNo: 'B1',
      daysToExpiry: 5,
    });
  });
});
