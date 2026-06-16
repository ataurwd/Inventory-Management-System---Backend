import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { ApiError } from './utils/api-error.util';
import { logger } from './utils/logger';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './modules/auth/auth.routes';
import productRouter from './modules/products/product.routes';
import batchRouter from './modules/batches/batch.routes';
import inventoryRouter from './modules/inventory/inventory.routes';
import transactionRouter from './modules/transactions/transaction.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import categoryRouter from './modules/categories/category.routes';
import forecastRouter from './modules/forecasts/forecast.routes';
import chatRouter from './modules/chat/chat.routes';
import supplierRouter from './modules/suppliers/supplier.routes';
import saleRouter from './modules/sales/sale.routes';
import brandRouter from './modules/brands/brand.routes';
import userRouter from './modules/users/user.routes';


export function createApp(): Application {
  const app = express();

  // ─── Core Middleware ──────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── HTTP Logging ─────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => logger.http(message.trim()),
        },
      })
    );
  }

  // ─── Health Check ─────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'inventory-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // ─── API Routes ──────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/products/:id/batches', batchRouter);
  app.use('/api/v1/inventory', inventoryRouter);
  app.use('/api/v1/transactions', transactionRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/forecasts', forecastRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/suppliers', supplierRouter);
  app.use('/api/v1/sales', saleRouter);
  app.use('/api/v1/brands', brandRouter);
  app.use('/api/v1/users', userRouter);

  // ─── 404 Handler ─────────────────────────────────────────────────
  app.use(notFound);

  // ─── Global Error Handler ─────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
