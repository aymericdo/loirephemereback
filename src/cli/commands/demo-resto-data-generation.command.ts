import { Command, CommandRunner } from 'nest-commander';
import { DemoRestoDataGenerationService } from 'src/shared/cron/demo-resto-data-generation.service';

@Command({
  name: 'demo-resto-data-generation',
  description: 'Demo resto data generation CLI',
})
export class DemoRestoDataGenerationCommand extends CommandRunner {
  constructor(
    private readonly demoRestoDataGenerationService: DemoRestoDataGenerationService,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log('Running...')
    await this.demoRestoDataGenerationService.handleCron();
    console.log('Done')
  }
}