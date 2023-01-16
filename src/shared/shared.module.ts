import { Global, Module } from '@nestjs/common';
import { WsCleanerService } from 'src/shared/crons/ws-cleaner.service';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';
import { SharedPastriesService } from 'src/shared/services/shared-pastries.service';
import { SharedRestaurantsService } from 'src/shared/services/shared-restaurants.service';
import { SharedUsersService } from 'src/shared/services/shared-users.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    SocketGateway,
    WebPushGateway,
    WsCleanerService,
    SharedPastriesService,
    SharedCommandsService,
    SharedUsersService,
    SharedRestaurantsService,
  ],
  exports: [
    SocketGateway,
    WebPushGateway,
    WsCleanerService,
    SharedPastriesService,
    SharedCommandsService,
    SharedUsersService,
    SharedRestaurantsService,
  ],
})
export class SharedModule {}
