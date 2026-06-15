import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  const maxRetries = 2;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('✅ MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries}/${maxRetries} failed:`, error);
      if (retries === maxRetries) {
        logger.warn('⚠️  Could not connect to MongoDB. Server will start without DB — some routes will be unavailable.');
        return;
      }
      // Wait 3 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
