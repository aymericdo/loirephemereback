import { Module } from '@nestjs/common';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { WsCleanerService } from 'src/shared/crons/ws-cleaner.service';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';

@Module({
  imports: [RestaurantsModule],
  controllers: [],
  providers: [SocketGateway, WebPushGateway, WsCleanerService],
  exports: [SocketGateway, WebPushGateway],
})
export class SharedModule {}
