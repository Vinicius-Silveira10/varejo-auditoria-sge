import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',').map(o => o.trim()).filter(Boolean),
    credentials: true,
  },
})
export class DashboardGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DashboardGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('Dashboard WebSocket Gateway Initialized');
    
    server.use((client: Socket, next) => {
      let token = null;

      if (client.handshake.headers.cookie) {
        const cookies = client.handshake.headers.cookie.split(';').map(c => c.trim());
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      if (!token && client.handshake.auth?.token) {
        token = client.handshake.auth.token;
      }

      if (!token && client.handshake.headers?.authorization) {
        token = client.handshake.headers.authorization.replace('Bearer ', '');
      }

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no JWT token`);
        return next(new Error('Authentication error'));
      }

      try {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
        client.data.user = payload;
        next();
      } catch {
        this.logger.warn(`Client ${client.id} rejected: invalid JWT`);
        next(new Error('Authentication error'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} (user: ${client.data.user?.email})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitDashboardUpdate(type: string, payload?: any) {
    if (this.server) {
      this.server.emit('dashboard:update', { type, payload });
      this.logger.log(`Emitted dashboard:update for event type: ${type}`);
    }
  }
}
