import { Logger } from '@nestjs/common';
import { UpdateCommandDto } from 'src/commands/dto/update-command.dto';
import { sendNotification, PushSubscription } from 'web-push';

export class WebPushGateway {
  adminsWaitingSubNotification: { [code: string]: PushSubscription[] } = {};
  clientWaitingQueueSubNotification: { [commandId: string]: PushSubscription } =
    {};

  private logger: Logger = new Logger(WebPushGateway.name);

  alertNewCommand(restaurantCode: string) {
    this.adminsWaitingSubNotification[restaurantCode]?.forEach((adminSub) => {
      this.sendPushNotif(adminSub, 'Une nouvelle commande est arrivée !', `https://oresto.app/${restaurantCode}/admin/commands?tab=ongoing`);
    });
  }

  addClientWaitingQueueSubNotification(
    sub: PushSubscription,
    commandId: string,
  ) {
    this.clientWaitingQueueSubNotification[commandId] = sub;
  }

  addAdminQueueSubNotification(code: string, sub: PushSubscription) {
    if (this.adminsWaitingSubNotification.hasOwnProperty(code)) {
      if (
        !this.adminsWaitingSubNotification[code].some(
          (notif) => notif.endpoint === sub.endpoint,
        )
      ) {
        this.adminsWaitingSubNotification[code].push(sub);
      }
    } else {
      this.adminsWaitingSubNotification[code] = [sub];
    }
  }

  deleteAdminQueueSubNotification(code: string, sub: PushSubscription) {
    if (this.adminsWaitingSubNotification.hasOwnProperty(code)) {
      this.adminsWaitingSubNotification[code] =
        this.adminsWaitingSubNotification[code].filter(
          (notif) => notif.endpoint !== sub?.endpoint,
        );
    }
  }

  sendCommandReady(data: UpdateCommandDto): void {
    const subNotification = this.clientWaitingQueueSubNotification[data._id];

    if (subNotification) {
      this.sendPushNotif(subNotification, 'Votre commande est prête !', `https://oresto.app/${(data as any).restaurant}?command=${data._id}`);
    }

    // remove old waiting info
    delete this.clientWaitingQueueSubNotification[data._id];
  }

  cleanup() {
    this.adminsWaitingSubNotification = {};
    this.clientWaitingQueueSubNotification = {};
  }

  private sendPushNotif(sub: PushSubscription, body: string, exploreUrl: string) {
    const payload = JSON.stringify({
      notification: {
        title: 'Oresto.app',
        body,
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [500, 110, 500, 110, 450],
        actions: [
          {
            action: 'explore',
            title: 'Ouvrir'
          },
          {
            action: 'close',
            title: 'Fermer'
          }
        ],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
          onActionClick: {
            default: { operation: 'openWindow' },
            explore: { operation: 'openWindow', url: exploreUrl },
          }
        },
      },
    });

    sendNotification(sub, payload)
      .then(() => {
        this.logger.log('webpush sent');
      })
      .catch((err: any) => this.logger.error(err));
  }
}
