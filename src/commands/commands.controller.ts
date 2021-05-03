import { Controller, Get } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { Command } from './command.interface';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Get()
  findAll(): Command[] {
    return this.commandsService.getAll();
  }
}
