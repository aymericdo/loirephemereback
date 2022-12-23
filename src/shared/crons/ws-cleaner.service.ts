import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';

@Injectable()
export class WsCleanerService {
  private readonly logger = new Logger(WsCleanerService.name);

  constructor(
    private readonly socketGateway: SocketGateway,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  handleCron() {
    this.logger.log(`Running...`);
    this.socketGateway.cleanup();
    this.webPushGateway.cleanup();
  }
}
