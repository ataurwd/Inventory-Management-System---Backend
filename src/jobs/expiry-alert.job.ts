import { Product } from '../modules/products/product.model';
import { daysUntilExpiry } from '../utils/date.util';
import { emitToRole } from '../sockets/notification.emitter';
import { SocketEvents } from '../sockets/events';
import { logger } from '../utils/logger';

export async function runExpiryAlertJob() {
  logger.info('⏰ Starting daily expiry alert cron job...');
  try {
    const products = await Product.find({ isDeleted: false });
    let alertsSent = 0;

    for (const product of products) {
      for (const batch of product.batches) {
        const days = daysUntilExpiry(batch.expiry_date);
        
        // Notify if expiring within 15 days (and has not already expired)
        if (days <= 15 && days > 0) {
          const alertPayload = {
            productId: product._id,
            name: product.name,
            batchNo: batch.batch_no,
            daysToExpiry: days,
          };

          emitToRole('admin', SocketEvents.EXPIRY_ALERT, alertPayload);
          emitToRole('manager', SocketEvents.EXPIRY_ALERT, alertPayload);
          alertsSent++;
        }
      }
    }

    logger.info(`✅ Expiry alert job completed. Sent ${alertsSent} alerts.`);
  } catch (error) {
    logger.error('❌ Error executing expiry alert cron job:', error);
  }
}
