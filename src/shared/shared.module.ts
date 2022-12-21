import { Module } from '@nestjs/common';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { WsCleanerService } from 'src/shared/crons/ws-cleaner.service';
import { SocketGateway } from 'src/web-socket.gateway';

@Module({
  imports: [RestaurantsModule],
  controllers: [],
  providers: [SocketGateway, WsCleanerService],
  exports: [SocketGateway],
})
export class SharedModule {}
