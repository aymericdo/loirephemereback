import { Logger } from '@nestjs/common';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { sendNotification, PushSubscription } from 'web-push';

export class WebPushGateway {
  adminSubsByRestaurantCode: { [code: string]: [string, PushSubscription][] } = {};
  clientSubByCommandId: { [commandId: string]: PushSubscription } = {};

  private logger: Logger = new Logger(WebPushGateway.name);

  alertNewCommand(restaurantCode: string) {
    this.adminSubsByRestaurantCode[restaurantCode]?.forEach(([_, sub]) => {
      this.sendPushNotif(sub, 'Une nouvelle commande est arrivée !', `https://oresto.app/${restaurantCode}/admin/commands?tab=ongoing`);
    });
  }

  addClientWaitingQueueSubNotification(
    sub: PushSubscription,
    commandId: string,
  ) {
    this.clientSubByCommandId[commandId] = sub;
  }

  addAdminQueueSubNotification(code: string, currentUserId: string, sub: PushSubscription) {
    if (this.adminSubsByRestaurantCode.hasOwnProperty(code)) {
      if (this.adminSubsByRestaurantCode[code].some((notification) => notification[0] === currentUserId)) {
        this.deleteAdminQueueSubNotification(code, currentUserId);
      }

      this.adminSubsByRestaurantCode[code].push([currentUserId, sub]);
    } else {
      this.adminSubsByRestaurantCode[code] = [[currentUserId, sub]];
    }
  }

  deleteAdminQueueSubNotification(code: string, currentUserId: string) {
    if (this.adminSubsByRestaurantCode.hasOwnProperty(code)) {
      this.adminSubsByRestaurantCode[code] =
        this.adminSubsByRestaurantCode[code].filter((notification) => notification[0] !== currentUserId);
    }
  }

  sendCommandReady(command: CommandDocument): void {
    const subNotification = this.clientSubByCommandId[command.id];

    if (subNotification) {
      // TODO : translate that
      this.sendPushNotif(subNotification, 'Votre commande est prête !', `https://oresto.app/${command.restaurant.code}?commandId=${command.id}`);
    }

    // remove sub after one usage
    delete this.clientSubByCommandId[command.id];
  }

  cleanup() {
    this.adminSubsByRestaurantCode = {};
    this.clientSubByCommandId = {};
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
            action: 'close',
            title: 'Fermer'
          }
        ],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
          onActionClick: {
            default: { operation: 'navigateLastFocusedOrOpen', url: exploreUrl },
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
