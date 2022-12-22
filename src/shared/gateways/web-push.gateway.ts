import { Logger } from '@nestjs/common';
import { CommandDocument } from '../../commands/schemas/command.schema';
import webpush = require('web-push');

export class WebPushGateway {
  adminsWaitingSubNotification: { [code: string]: PushSubscription[] } = {};
  clientWaitingQueueSubNotification: { [commandId: string]: PushSubscription } =
    {};

  private logger: Logger = new Logger(WebPushGateway.name);

  alertNewCommand(code: string) {
    this.adminsWaitingSubNotification[code]?.forEach((adminSub) => {
      this.sendPushNotif(adminSub, 'Une nouvelle commande est arrivée !');
    });
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

  sendCommandReady(data: CommandDocument): void {
    const subNotification = this.clientWaitingQueueSubNotification[data._id];

    if (subNotification) {
      this.sendPushNotif(subNotification, 'Votre commande est prête !');
    }

    // remove old waiting info
    delete this.clientWaitingQueueSubNotification[data._id];
  }

  cleanup() {
    this.adminsWaitingSubNotification = {};
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
        this.logger.log('webpush sent');
      })
      .catch((err) => this.logger.error(err));
  }
}
