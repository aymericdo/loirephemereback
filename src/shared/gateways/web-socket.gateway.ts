import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import WebSocket, { Server } from 'ws';
import { CommandDocument } from '../../commands/schemas/command.schema';
import { WsThrottlerGuard } from 'src/shared/guards/ws-throttler.guard';
import { WsJwtAuthGuard } from 'src/auth/ws-jwt-auth.guard';
import { Request } from 'express';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';

interface Client extends WebSocket {
  request: Request;
}

@WebSocketGateway()
@UseGuards(WsThrottlerGuard)
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @WebSocketServer() server: Server;
  clients: { [code: string]: Client[] } = {};
  admins: { [code: string]: Client[] } = {};

  clientWaitingQueue: { [commandId: string]: Client } = {};

  private logger: Logger = new Logger(SocketGateway.name);

  handleDisconnect(client: Client) {
    const code = this.getCodeFromQueryParam(client.request.url);
    this.clients[code] = this.clients[code]?.filter((c) => c !== client);
    this.admins[code] = this.admins[code]?.filter((c) => c !== client);

    this.logger.log(`Client disconnected`);
    client.send(JSON.stringify({ bye: 'au revoir' }));
  }

  handleConnection(client: Client, request: Request) {
    const code = this.getCodeFromQueryParam(request.url);
    this.logger.log('Client connected');
    client['request'] = request;
    client.send(JSON.stringify({ hello: 'bonjour' }));

    if (this.clients.hasOwnProperty(code)) {
      this.clients[code].push(client);
    } else {
      this.clients[code] = [client];
    }
  }

  alertNewCommand(code: string, command: CommandDocument) {
    this.admins[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ addCommand: command })),
    );
  }

  alertCloseCommand(code: string, command: CommandDocument) {
    this.admins[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ closeCommand: command })),
    );
  }

  alertPayedCommand(code: string, command: CommandDocument) {
    this.admins[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ payedCommand: command })),
    );
  }

  stockChanged(code: string, newStock: { pastryId: string; newStock: number }) {
    this.clients[code]?.forEach((client: Client) =>
      client.send(JSON.stringify({ stockChanged: newStock })),
    );
  }

  @SubscribeMessage('wizzer')
  onWizzer(@MessageBody() data: CommandDocument): void {
    this.webPushGateway.sendCommandReady(data);

    const ws = this.clientWaitingQueue[data._id];

    if (ws) {
      ws.send(JSON.stringify({ wizz: data._id }));
    }

    // remove old waiting info
    delete this.clientWaitingQueue[data._id];
  }

  @SubscribeMessage('addclientWaitingQueue')
  onAddclientWaitingQueue(
    @MessageBody() data: CommandDocument,
    @ConnectedSocket() client: Client,
  ): void {
    this.clientWaitingQueue[data._id] = client;
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('authorization')
  onAuthorization(@ConnectedSocket() client: Client): void {
    const code = this.getCodeFromQueryParam(client.request.url);

    const userId = (client.request.user as { userId: string }).userId;
    if (!this.restaurantsService.isUserInRestaurant(code, userId)) {
      return;
    }

    if (this.admins.hasOwnProperty(code)) {
      this.admins[code].push(client);
    } else {
      this.admins[code] = [client];
    }

    this.logger.log('Admin connected');
  }

  cleanup() {
    this.admins = {};
    this.clients = {};
    this.clientWaitingQueue = {};
  }

  private getCodeFromQueryParam(url: string): string {
    const queryParams = new URLSearchParams(url.substring(1));
    return queryParams.get('code');
  }
}