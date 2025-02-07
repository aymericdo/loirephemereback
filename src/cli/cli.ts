import { CommandFactory } from 'nest-commander';
import { CliModule } from 'src/cli/cli.module';

async function bootstrap() {
  await CommandFactory.run(CliModule, ['warn', 'error']);
}

bootstrap();