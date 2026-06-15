import cron from 'node-cron';
import { runExpiryAlertJob } from './expiry-alert.job';
import { logger } from '../utils/logger';

export function initScheduler() {
  logger.info('🗓️ Initializing cron scheduler...');

  // runs: '0 8 * * *' (every day at 08:00 AM)
  cron.schedule('0 8 * * *', async () => {
    logger.info('⏰ Scheduled daily task triggered: runExpiryAlertJob');
    await runExpiryAlertJob();
  });

  // runs: '0 0 * * *' (midnight)
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Scheduled daily task triggered: runNightlyForecast');
    const { runNightlyForecast } = await import('./nightly-forecast.job');
    await runNightlyForecast();
  });

  logger.info('✅ Cron scheduler initialized. Daily jobs registered.');
}
