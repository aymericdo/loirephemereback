import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PastriesModule } from 'src/pastries/pastries.module';
import { SharedModule } from 'src/shared/shared.module';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';
import { Command, CommandSchema } from './schemas/command.schema';

@Module({
  imports: [
    SharedModule,
    PastriesModule,
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  controllers: [CommandsController],
  providers: [CommandsService],
})
export class CommandsModule {}
