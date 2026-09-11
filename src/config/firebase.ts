import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { logger } from '../utils/logger';

export function initFirebase() {
  try {
    if (getApps().length === 0) {
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
          privateKey = privateKey.slice(1, -1);
        }
        if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
          privateKey = privateKey.slice(1, -1);
        }
        privateKey = privateKey.replace(/\\n/g, '\n');

        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        logger.info('Firebase Admin SDK initialized successfully with environment variables');
      } else {
        try {
          const projectId = process.env.FIREBASE_PROJECT_ID || 'smartstockai-1c233';
          initializeApp({ projectId });
          logger.info(`Firebase Admin SDK initialized with project ID: ${projectId}`);
        } catch (err) {
          logger.warn('⚠️ Firebase Admin SDK initialization fallback error:', err);
        }
      }
    }
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('⚠️ Server continuing in development mode without Firebase Admin SDK.');
    }
  }
}
