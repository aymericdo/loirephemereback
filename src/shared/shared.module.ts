import { Module } from '@nestjs/common';
import { SocketGateway } from 'src/web-socket.gateway';

@Module({
  imports: [],
  controllers: [],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SharedModule {}
