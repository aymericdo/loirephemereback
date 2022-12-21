import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SocketGateway } from 'src/web-socket.gateway';

@Injectable()
export class WsCleanerService {
  private readonly logger = new Logger(WsCleanerService.name);

  constructor(private readonly socketGateway: SocketGateway) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  handleCron() {
    this.logger.log(`Running...`);
    this.socketGateway.cleanup();
  }
}
