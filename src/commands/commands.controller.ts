import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { Command } from './interfaces/command.interface';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Get()
  async findAll(@Res() res) {
    const pastries = await this.commandsService.getAll();
    return res.status(HttpStatus.OK).json(pastries);
  }
}
