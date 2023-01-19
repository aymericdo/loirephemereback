import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DemoRestoCleanupService } from 'src/shared/mocks/demo-resto-cleanup.service';
import { DemoRestoRefillService } from 'src/shared/mocks/demo-resto-refill.service';

@Injectable()
export class DemoRestoDataGenerationService {
  private readonly logger = new Logger(DemoRestoDataGenerationService.name);

  constructor(
    private readonly demoRestoCleanupService: DemoRestoCleanupService,
    private readonly demoRestoRefillService: DemoRestoRefillService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    this.logger.log(`Running...`);
    await this.demoRestoCleanupService.call();
    this.logger.log('Cleanup done');
    await this.demoRestoRefillService.call();
    this.logger.log(`Done`);
  }
}
