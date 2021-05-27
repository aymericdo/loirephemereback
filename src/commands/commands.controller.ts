import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';

@Controller('commands')
export class CommandsController {
  constructor(private readonly commandsService: CommandsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll(@Res() res) {
    const commands = await this.commandsService.findAll();
    return res.status(HttpStatus.OK).json(commands);
  }

  @Post()
  async postCommand(@Res() res, @Body() createCatDto: CreateCommandDto) {
    const command = await this.commandsService.create(createCatDto);
    return res.status(HttpStatus.OK).json(command);
  }

  @Put(':id')
  async putCommand(@Res() res, @Body() updateCatDto: UpdateCommandDto) {
    const command = await this.commandsService.update(updateCatDto);
    return res.status(HttpStatus.OK).json(command);
  }
}
