import { Module } from '@nestjs/common';
import { WsCleanerService } from 'src/notifications/crons/ws-cleaner.service';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { SocketGateway } from 'src/notifications/gateways/web-socket.gateway';

@Module({
  imports: [],
  providers: [SocketGateway, WebPushGateway, WsCleanerService],
  exports: [SocketGateway, WebPushGateway],
})
export class NotificationsModule {}
