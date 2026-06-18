import { Server, Socket } from 'socket.io';
import { getAuth } from 'firebase-admin/auth';
import { findByEmail } from '../modules/users/user.service';
import { logger } from '../utils/logger';

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, pair) => {
    const parts = pair.split('=');
    if (parts.length < 2) return acc;
    const name = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    acc[name] = decodeURIComponent(val);
    return acc;
  }, {} as Record<string, string>);
}

export function registerSocketManager(io: Server) {
  // Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
      }

      if (!token) {
        const cookieHeader = socket.handshake.headers.cookie;
        const cookies = parseCookies(cookieHeader);
        token = cookies.token;
      }

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decodedToken = await getAuth().verifyIdToken(token);
      
      if (!decodedToken.email) {
        return next(new Error('Invalid token: missing email'));
      }

      const user = await findByEmail(decodedToken.email);
      
      if (!user) {
        return next(new Error("You don't have an account. Please contact the administrator."));
      }

      // Attach user object to socket
      (socket as any).user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`🔌 Socket connected: ${user.name} (${user.role}) - ID: ${socket.id}`);

    // Join room based on user role
    socket.join(user.role);
    logger.info(`🏠 Socket ${socket.id} joined room: ${user.role}`);

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}
