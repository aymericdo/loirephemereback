import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppGateway } from 'src/app.gateway';
import { PastriesModule } from 'src/pastries/pastries.module';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { Command, CommandSchema } from './schemas/command.schema';

@Module({
  imports: [
    PastriesModule,
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  controllers: [CommandsController],
  providers: [CommandsService, AppGateway],
})
export class CommandsModule {}
