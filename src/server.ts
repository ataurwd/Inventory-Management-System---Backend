import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initFirebase } from './config/firebase';
import { initSocket } from './config/socket';
import { registerSocketManager } from './sockets/socket.manager';
import { initScheduler } from './jobs/scheduler';

async function bootstrap(): Promise<void> {
  // ─── Connect to Database ──────────────────────────────────────────
  await connectDB();

  // ─── Initialize Firebase Admin ────────────────────────────────────
  initFirebase();

  // ─── Create Express App ───────────────────────────────────────────
  const app = createApp();
  const httpServer = http.createServer(app);

  // ─── Initialize Socket.IO ─────────────────────────────────────────
  const io = initSocket(httpServer);
  registerSocketManager(io);

  // ─── Initialize Cron Scheduler ────────────────────────────────────
  initScheduler();

  // ─── Start Listening ──────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 Server listening on port ${env.PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
  });
}

bootstrap();
