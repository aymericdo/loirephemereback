import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WsResponse,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'ws';
import WebSocket = require('ws');
import { Observable } from 'rxjs';
import { Command } from './commands/schemas/command.schema';

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  users: WebSocket[] = [];
  admins: WebSocket[] = [];

  private logger: Logger = new Logger('AppGateway');

  handleDisconnect(client: WebSocket) {
    this.logger.log(`Client disconnected`);
    client.send(JSON.stringify({ bye: 'au revoir' }));
  }

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log(`Client connected`);
    client.send(JSON.stringify({ hello: 'bonjour' }));
    this.users.push(client);
  }

  alertNewCommand(command: Command) {
    this.admins.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ addCommand: command })),
    );
  }

  alertCloseCommand(command: Command) {
    this.admins.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ closeCommand: command })),
    );
  }

  stockChanged(newStock: { pastryId: string; newStock: number }) {
    this.users.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ stockChanged: newStock })),
    );
  }

  @SubscribeMessage('authorization')
  onEvent(
    @MessageBody() data: string,
    @ConnectedSocket() client: WebSocket,
  ): Observable<WsResponse<number>> {
    if (data === process.env.PASSWORD) {
      this.admins.push(client);
    }
    return null;
  }
}
