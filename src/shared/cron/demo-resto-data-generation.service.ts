import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { DemoRestoCleanupService } from 'src/shared/mocks/demo-resto-cleanup.service';
import { DemoRestoRefillService } from 'src/shared/mocks/demo-resto-refill.service';

@Injectable()
export class DemoRestoDataGenerationService {
  private readonly logger = new Logger(DemoRestoDataGenerationService.name);

  constructor(
    private readonly demoRestoCleanupService: DemoRestoCleanupService,
    private readonly demoRestoRefillService: DemoRestoRefillService,
  ) {}

  // @Cron(CronExpression.EVERY_MINUTE)
  handleCron() {
    this.logger.log(`Running...`);
    this.demoRestoCleanupService.call();
    this.demoRestoRefillService.call();
    this.logger.log(`Done`);
  }
}
