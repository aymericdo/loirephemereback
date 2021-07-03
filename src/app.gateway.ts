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
import { Command } from './commands/schemas/command.interface';

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  users: WebSocket[] = [];
  waitingQueue: { commandId: string; ws: WebSocket }[] = [];
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

  @SubscribeMessage('wizzer')
  onWizzer(
    @MessageBody() data: Command,
    @ConnectedSocket() client: WebSocket,
  ): void {
    const ws = this.waitingQueue.find((user) => user.commandId === data._id)
      ?.ws;

    if (!ws) return;
    ws.send(JSON.stringify({ wizz: data._id }));
  }

  @SubscribeMessage('addWaitingQueue')
  onAddWaitingQueue(
    @MessageBody() data: Command,
    @ConnectedSocket() client: WebSocket,
  ): void {
    this.waitingQueue.push({ commandId: data._id, ws: client });
  }

  @SubscribeMessage('authorization')
  onAuthorization(
    @MessageBody() data: string,
    @ConnectedSocket() client: WebSocket,
  ): void {
    if (data === process.env.PASSWORD) {
      this.admins.push(client);
    }
  }
}
