import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommandsController } from './commands.controller';
import { CommandsGateway } from './commands.gateway';
import { CommandsService } from './commands.service';
import { Command, CommandSchema } from './schemas/command.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  controllers: [CommandsController],
  providers: [CommandsService, CommandsGateway],
})
export class CommandsModule {}
