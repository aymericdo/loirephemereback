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
import { CommandDocument } from './commands/schemas/command.schema';
import webpush = require('web-push');
import { WsThrottlerGuard } from 'src/shared/guards/ws-throttler.guard';
import { WsJwtAuthGuard } from 'src/auth/ws-jwt-auth.guard';
import { Request } from 'express';
import { RestaurantsService } from 'src/restaurants/restaurants.service';

interface Client extends WebSocket {
  request: Request;
}

@WebSocketGateway()
@UseGuards(WsThrottlerGuard)
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @WebSocketServer() server: Server;
  clients: { [code: string]: Client[] } = {};
  admins: { [code: string]: Client[] } = {};
  adminsWaitingSubNotification: { [code: string]: PushSubscription[] } = {};

  clientWaitingQueue: { [commandId: string]: Client } = {};
  clientWaitingQueueSubNotification: { [commandId: string]: PushSubscription } =
    {};

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
    this.admins[code].forEach((client: Client) =>
      client.send(JSON.stringify({ addCommand: command })),
    );

    this.adminsWaitingSubNotification[code].forEach((adminSub) => {
      this.sendPushNotif(adminSub, 'Une nouvelle commande est arrivée !');
    });
  }

  alertCloseCommand(code: string, command: CommandDocument) {
    this.admins[code].forEach((client: Client) =>
      client.send(JSON.stringify({ closeCommand: command })),
    );
  }

  alertPayedCommand(code: string, command: CommandDocument) {
    this.admins[code].forEach((client: Client) =>
      client.send(JSON.stringify({ payedCommand: command })),
    );
  }

  stockChanged(code: string, newStock: { pastryId: string; newStock: number }) {
    this.clients[code].forEach((client: Client) =>
      client.send(JSON.stringify({ stockChanged: newStock })),
    );
  }

  addClientWaitingQueueSubNotification(subNotif: {
    sub: PushSubscription;
    commandId: string;
  }) {
    this.clientWaitingQueueSubNotification[subNotif.commandId] = subNotif.sub;
  }

  addAdminQueueSubNotification(subNotif: {
    sub: PushSubscription;
    code: string;
  }) {
    if (this.adminsWaitingSubNotification.hasOwnProperty(subNotif.code)) {
      if (
        !this.adminsWaitingSubNotification[subNotif.code].some(
          (notif) => notif.endpoint === subNotif.sub.endpoint,
        )
      ) {
        this.adminsWaitingSubNotification[subNotif.code].push(subNotif.sub);
      }
    } else {
      this.adminsWaitingSubNotification[subNotif.code] = [subNotif.sub];
    }
  }

  deleteAdminQueueSubNotification(subNotif: {
    sub: PushSubscription;
    code: string;
  }) {
    if (this.adminsWaitingSubNotification.hasOwnProperty(subNotif.code)) {
      this.adminsWaitingSubNotification[subNotif.code] =
        this.adminsWaitingSubNotification[subNotif.code].filter(
          (notif) => notif.endpoint !== subNotif.sub.endpoint,
        );
    }
  }

  @SubscribeMessage('wizzer')
  onWizzer(@MessageBody() data: CommandDocument): void {
    const ws = this.clientWaitingQueue[data._id];
    const subNotification = this.clientWaitingQueueSubNotification[data._id];

    if (subNotification) {
      this.sendPushNotif(subNotification, 'Votre commande est prête !');
    }

    if (ws) {
      ws.send(JSON.stringify({ wizz: data._id }));
    }

    // remove old waiting info
    delete this.clientWaitingQueue[data._id];
    delete this.clientWaitingQueueSubNotification[data._id];
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
    this.adminsWaitingSubNotification = {};
    this.clientWaitingQueue = {};
    this.clientWaitingQueueSubNotification = {};
  }

  private sendPushNotif(sub: PushSubscription, body: string) {
    const payload = JSON.stringify({
      notification: {
        title: 'Petite notif gentille',
        body,
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [
          500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110,
          170, 40, 500,
        ],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
        },
      },
    });

    webpush
      .sendNotification(sub, payload)
      .then(() => {
        console.log('notif sent');
      })
      .catch((err) => console.error(err));
  }

  private getCodeFromQueryParam(url: string): string {
    const queryParams = new URLSearchParams(url.substring(1));
    return queryParams.get('code');
  }
}
