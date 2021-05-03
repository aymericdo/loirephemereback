import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PastriesController } from './pastries/pastries.controller';
import { AppService } from './app.service';
import { PastriesService } from './pastries/pastries.service';
import { CommandsController } from './commands/commands.controller';
import { CommandsService } from './commands/commands.service';

@Module({
  imports: [],
  controllers: [AppController, PastriesController, CommandsController],
  providers: [AppService, PastriesService, CommandsService],
})
export class AppModule {}
