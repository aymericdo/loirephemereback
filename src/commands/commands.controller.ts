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
import { AppGateway } from 'src/app.gateway';
import { Pastry } from 'src/pastries/schemas/pastry.schema';
import { AuthGuard } from './auth.guard';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly commandsService: CommandsService,
    private readonly appGateway: AppGateway,
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
    this.appGateway.alertCloseCommand(command);
    return res.status(HttpStatus.OK).json(command);
  }

  @Post()
  async postCommand(@Res() res, @Body() createCatDto: CreateCommandDto) {
    const command = await this.commandsService.create(createCatDto);
    this.appGateway.alertNewCommand(command);
    command.pastries.reduce((prev: string[], pastry: any) => {
      if (!prev.includes(pastry._id)) {
        prev.push(pastry._id);
        this.appGateway.stockChanged({
          pastryId: (pastry as any)._id,
          newStock: pastry.stock,
        });
      }

      return prev;
    }, []);
    return res.status(HttpStatus.OK).json(command);
  }

  // @Put(':reference')
  // async putCommand(@Param('reference') reference: string, @Res() res, @Body() updateCatDto: UpdateCommandDto) {
  //   const command = await this.commandsService.update(updateCatDto);
  //   return res.status(HttpStatus.OK).json(command);
  // }
}
