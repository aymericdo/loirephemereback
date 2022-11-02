import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'ws';
import WebSocket = require('ws');
import { CommandDocument } from './commands/schemas/command.schema';
import webpush = require('web-push');

const wsPort: number = +process.env.WS_PORT || null;
@WebSocketGateway(wsPort)
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  users: WebSocket[] = [];
  waitingQueue: { commandId: string; ws: WebSocket }[] = [];
  waitingQueueSubNotification: { commandId: string; sub: any }[] = [];
  waitingAdminSubNotification: { sub: any }[] = [];
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

  alertNewCommand(command: CommandDocument) {
    this.admins.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ addCommand: command })),
    );

    this.waitingAdminSubNotification.forEach((adminSub) => {
      this.sendPushNotif(
        adminSub.sub,
        'Une nouvelle commande est arrivée !',
        command,
      );
    });
  }

  alertCloseCommand(command: CommandDocument) {
    this.admins.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ closeCommand: command })),
    );
  }

  alertPayedCommand(command: CommandDocument) {
    this.admins.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ payedCommand: command })),
    );
  }

  stockChanged(newStock: { pastryId: string; newStock: number }) {
    this.users.forEach((client: WebSocket) =>
      client.send(JSON.stringify({ stockChanged: newStock })),
    );
  }

  addWaitingQueueSubNotification(subNotif: { sub: any; commandId: string }) {
    this.waitingQueueSubNotification.push({
      commandId: subNotif.commandId,
      sub: subNotif.sub,
    });
  }

  addAdminQueueSubNotification(subNotif: { sub: any }) {
    if (
      !this.waitingAdminSubNotification.some(
        (notif) => notif.sub.endpoint === subNotif.sub.endpoint,
      )
    ) {
      this.waitingAdminSubNotification.push({
        sub: subNotif.sub,
      });
    }
  }

  @SubscribeMessage('wizzer')
  onWizzer(
    @MessageBody() data: CommandDocument,
    @ConnectedSocket() client: WebSocket,
  ): void {
    const ws = this.waitingQueue.find((user) => user.commandId === data._id)?.ws;

    const subNotification = this.waitingQueueSubNotification.find(
      (subNotif) => subNotif.commandId === data._id,
    )?.sub;

    if (subNotification) {
      this.sendPushNotif(subNotification, 'Votre commande est prête !', data);
    }

    if (ws) {
      ws.send(JSON.stringify({ wizz: data._id }));
    }
  }

  @SubscribeMessage('addWaitingQueue')
  onAddWaitingQueue(
    @MessageBody() data: CommandDocument,
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

  private sendPushNotif(sub: any, body: string, _command: CommandDocument) {
    const payload = JSON.stringify({
      notification: {
        title: 'Petite notif gentille',
        body,
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [
          500,
          110,
          500,
          110,
          450,
          110,
          200,
          110,
          170,
          40,
          450,
          110,
          200,
          110,
          170,
          40,
          500,
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
}
