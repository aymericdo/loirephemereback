import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Command } from 'nest-commander';
import { AppModule } from 'src/app.module';
import { CommandsModule } from 'src/commands/commands.module';
import { CommandSchema } from 'src/commands/schemas/command.schema';
import { PastriesModule } from 'src/pastries/pastries.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { DemoRestoDataGenerationCommand } from 'src/cli/commands/demo-resto-data-generation.command';
import { DemoRestoDataGenerationService } from 'src/shared/cron/demo-resto-data-generation.service';
import { DemoRestoCleanupService } from 'src/shared/mocks/demo-resto-cleanup.service';
import { DemoRestoRefillService } from 'src/shared/mocks/demo-resto-refill.service';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';

@Module({
  imports: [
    AppModule,
    RestaurantsModule,
    PastriesModule,
    CommandsModule,
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  providers: [
    DemoRestoDataGenerationCommand,
    DemoRestoDataGenerationService,
    DemoRestoRefillService,
    DemoRestoCleanupService,
    SharedCommandsService,
  ],
})
export class CliModule {}