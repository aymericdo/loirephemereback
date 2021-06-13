import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { CommandsGateway } from './commands.gateway';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly commandsService: CommandsService,
    private readonly commandsGateway: CommandsGateway,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll(@Res() res) {
    const commands = await this.commandsService.findAll();
    return res.status(HttpStatus.OK).json(commands);
  }

  @Patch('/close/:id')
  async patchCommand(@Param('id') id: string, @Res() res) {
    const command = await this.commandsService.closeCommand(id);
    this.commandsGateway.alertCloseCommand(command);
    return res.status(HttpStatus.OK).json(command);
  }

  @Post()
  async postCommand(@Res() res, @Body() createCatDto: CreateCommandDto) {
    const command = await this.commandsService.create(createCatDto);
    this.commandsGateway.alertNewCommand(command);
    return res.status(HttpStatus.OK).json(command);
  }

  // @Put(':reference')
  // async putCommand(@Param('reference') reference: string, @Res() res, @Body() updateCatDto: UpdateCommandDto) {
  //   const command = await this.commandsService.update(updateCatDto);
  //   return res.status(HttpStatus.OK).json(command);
  // }
}
