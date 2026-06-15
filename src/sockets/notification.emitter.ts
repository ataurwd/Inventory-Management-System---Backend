import { getIO } from '../config/socket';
import { SocketEvents } from './events';

export function emitToRole(role: 'admin' | 'manager' | 'cashier', event: SocketEvents, data: any) {
  try {
    const io = getIO();
    if (!io) return;
    io.to(role).emit(event, data);
  } catch (error) {
    console.error(`Failed to emit event ${event} to role ${role}:`, error);
  }
}

export function emitToAll(event: SocketEvents, data: any) {
  try {
    const io = getIO();
    if (!io) return;
    io.emit(event, data);
  } catch (error) {
    console.error(`Failed to emit event ${event} to all:`, error);
  }
}
