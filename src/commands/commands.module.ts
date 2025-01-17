import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PastriesModule } from 'src/pastries/pastries.module';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { Command, CommandSchema } from './schemas/command.schema';
import { PaymentRequiredCommandCleanerService } from 'src/commands/cron/payment-required-command-cleaner.service';

@Module({
  imports: [
    PastriesModule,
    NotificationsModule,
    RestaurantsModule,
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  controllers: [CommandsController],
  providers: [CommandsService, PaymentRequiredCommandCleanerService],
  exports: [CommandsService],
})
export class CommandsModule {}
