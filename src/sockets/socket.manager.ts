import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/auth.service';
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
  io.use((socket: Socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      const token = cookies.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = verifyAccessToken(token);
      
      // Attach user object to socket
      (socket as any).user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name,
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
