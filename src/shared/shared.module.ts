import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandsModule } from 'src/commands/commands.module';
import { Command, CommandSchema } from 'src/commands/schemas/command.schema';
import { PastriesModule } from 'src/pastries/pastries.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { DemoRestoDataGenerationService } from 'src/shared/cron/demo-resto-data-generation.service';
import { DemoRestoCleanupService } from 'src/shared/mocks/demo-resto-cleanup.service';
import { DemoRestoRefillService } from 'src/shared/mocks/demo-resto-refill.service';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';

@Global()
@Module({
  imports: [
    RestaurantsModule,
    PastriesModule,
    CommandsModule,
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  providers: [
    SharedCommandsService,
    DemoRestoDataGenerationService,
    DemoRestoRefillService,
    DemoRestoCleanupService,
  ],
  exports: [SharedCommandsService],
})
export class SharedModule {}
