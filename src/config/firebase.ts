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
        // Fallback for default application credentials (e.g. if GOOGLE_APPLICATION_CREDENTIALS is set)
        initializeApp();
        logger.info('Firebase Admin SDK initialized with default application credentials');
      }
    }
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK', error);
    process.exit(1); // Force exit so we don't run in a broken state
  }
}
