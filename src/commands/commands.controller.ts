import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AppGateway } from 'src/app.gateway';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { AuthGuard } from './auth.guard';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly commandsService: CommandsService,
    private readonly appGateway: AppGateway,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getAll(@Res() res, @Query() query) {
    const commands = await this.commandsService.findAll(query.year);

    return res.status(HttpStatus.OK).json(commands);
  }

  @Get('by-code/:code')
  @UseGuards(AuthGuard)
  async getCommandsByCode(@Res() res, @Param('code') code, @Query() query) {
    const commands = await this.commandsService.findByCode(code, query.year);

    return res.status(HttpStatus.OK).json(commands);
  }

  @Patch('/close/:id')
  async patchCommand(@Param('id') id: string, @Res() res) {
    const command = await this.commandsService.closeCommand(id);
    this.appGateway.alertCloseCommand(command as any);
    return res.status(HttpStatus.OK).json(command);
  }

  @Patch('/payed/:id')
  async patchCommand2(@Param('id') id: string, @Res() res) {
    const command = await this.commandsService.payedCommand(id);
    this.appGateway.alertPayedCommand(command as any);
    return res.status(HttpStatus.OK).json(command);
  }

  @Post(':code')
  async postCommand(
    @Res() res,
    @Body() body: CreateCommandDto,
    @Param('code') code,
  ) {
    const pastriesGroupById: { [pastryId: string]: number } =
      this.commandsService.reducePastriesById(body.pastries);

    const transactionSession = await this.connection.startSession();

    try {
      transactionSession.startTransaction();

      const restaurant: RestaurantDocument =
        await this.restaurantsService.findByCode(code);

      const pastriesToZero: PastryDocument[] =
        this.commandsService.pastriesReached0(pastriesGroupById);

      if (pastriesToZero.length) {
        return res
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json({ outOfStock: pastriesToZero });
      }

      const command = await this.commandsService.create(restaurant, body);
      this.appGateway.alertNewCommand(code, command as any);

      this.commandsService.stockManagement(code, pastriesGroupById);

      transactionSession.commitTransaction();
      return res.status(HttpStatus.OK).json(command);
    } catch (err) {
      transactionSession.abortTransaction();
    } finally {
      transactionSession.endSession();
    }
  }

  @Post('notification')
  async postNotificationSub(@Res() res, @Body() body: { sub: any }) {
    this.appGateway.addAdminQueueSubNotification(body);

    res.status(HttpStatus.OK).json();
  }
}
