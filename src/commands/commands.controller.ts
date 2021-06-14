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
import { PastriesService } from 'src/pastries/pastries.service';
import { Pastry } from 'src/pastries/schemas/pastry.schema';
import { AuthGuard } from './auth.guard';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { Pastry as PastryInterface } from 'src/pastries/schemas/pastry.interface';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly pastriesService: PastriesService,
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
    const pastriesGroupBy = createCatDto.pastries.reduce(
      (prev, pastry: PastryInterface) => {
        if (!prev.hasOwnProperty(pastry._id)) {
          prev[pastry._id] = 1;
        } else {
          prev[pastry._id] = prev[pastry._id] + 1;
        }
        return prev;
      },
      {},
    );

    const pastriesToZero = await Object.keys(pastriesGroupBy).reduce(
      async (prev: any, pastryId) => {
        const oldPastry: Pastry = await this.pastriesService.findOne(pastryId);
        if (oldPastry.stock - pastriesGroupBy[pastryId] < 0) {
          prev.push(oldPastry);
        }
        return prev;
      },
      [],
    );

    if (pastriesToZero.length) {
      return res
        .status(HttpStatus.UNPROCESSABLE_ENTITY)
        .json({ outOfStock: pastriesToZero });
    }

    Object.keys(pastriesGroupBy).forEach(async (pastryId) => {
      const oldPastry = await this.pastriesService.findOne(pastryId);

      const pastry = await this.pastriesService.decrementStock(
        oldPastry as PastryInterface,
        pastriesGroupBy[pastryId],
      );

      this.appGateway.stockChanged({
        pastryId: pastryId,
        newStock: pastry.stock,
      });
    });

    const command = await this.commandsService.create(createCatDto);
    this.appGateway.alertNewCommand(command);

    return res.status(HttpStatus.OK).json(command);
  }

  // @Put(':reference')
  // async putCommand(@Param('reference') reference: string, @Res() res, @Body() updateCatDto: UpdateCommandDto) {
  //   const command = await this.commandsService.update(updateCatDto);
  //   return res.status(HttpStatus.OK).json(command);
  // }
}
