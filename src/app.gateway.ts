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
import { Command } from './commands/schemas/command.interface';
import webpush = require('web-push');

@WebSocketGateway()
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  users: WebSocket[] = [];
  waitingQueue: { commandId: string; ws: WebSocket }[] = [];
  waitingQueueSubNotification: { commandId: string; sub: any }[] = [];
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

  addWaitingQueueSubNotification(subNotif: { sub: any; commandId: string }) {
    console.log('addWaitingQueueSubNotification');
    this.waitingQueueSubNotification.push({
      commandId: subNotif.commandId,
      sub: subNotif.sub,
    });
  }

  @SubscribeMessage('wizzer')
  onWizzer(
    @MessageBody() data: Command,
    @ConnectedSocket() client: WebSocket,
  ): void {
    const ws = this.waitingQueue.find((user) => user.commandId === data._id)
      ?.ws;

    const subNotification = this.waitingQueueSubNotification.find(
      (subNotif) => subNotif.commandId === data._id,
    )?.sub;

    if (subNotification) {
      console.log('subNotification');
      console.log(subNotification);
      this.sendPushNotif(subNotification, data);
    }

    if (ws) {
      ws.send(JSON.stringify({ wizz: data._id }));
    }
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

  private sendPushNotif(sub: any, _command: Command) {
    const payload = JSON.stringify({
      notification: {
        title: 'La colone vendome',
        body: 'Votre commande est prête !',
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
