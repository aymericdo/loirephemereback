import { Module } from '@nestjs/common';
import { WsCleanerService } from 'src/shared/crons/ws-cleaner.service';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [],
  providers: [SocketGateway, WebPushGateway, WsCleanerService],
  exports: [SocketGateway, WebPushGateway, WsCleanerService],
})
export class SharedModule {}
