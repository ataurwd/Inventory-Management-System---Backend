import { Server } from 'socket.io';
import http from 'http';
import { env } from '../config/env';

let io: Server | null = null;

export function initSocket(server: http.Server): Server {
  io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
  });
  return io;
}

export function getIO(): Server | null {
  return io;
}
