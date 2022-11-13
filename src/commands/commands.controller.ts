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
import { PastriesService } from 'src/pastries/pastries.service';
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
    private readonly pastriesService: PastriesService,
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
    const pastriesGroupBy = body.pastries.reduce(
      (prev, pastry: PastryDocument) => {
        if (pastry.stock === undefined || pastry.stock === null) {
          return prev;
        }

        if (!prev.hasOwnProperty(pastry._id)) {
          prev[pastry._id] = 1;
        } else {
          prev[pastry._id] = prev[pastry._id] + 1;
        }
        return prev;
      },
      {},
    );

    const transactionSession = await this.connection.startSession();

    try {
      transactionSession.startTransaction();

      const restaurant: RestaurantDocument =
        await this.restaurantsService.findByCode(code);

      const pastriesToZero = await Object.keys(pastriesGroupBy).reduce(
        async (prev: any, pastryId) => {
          const oldPastry: PastryDocument = await this.pastriesService.findOne(
            pastryId,
          );

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

      const command = await this.commandsService.create(restaurant, body);
      this.appGateway.alertNewCommand(code, command as any);

      Object.keys(pastriesGroupBy).forEach(async (pastryId) => {
        const oldPastry: PastryDocument = await this.pastriesService.findOne(
          pastryId,
        );

        if (oldPastry.commonStock) {
          const oldPastries = await this.pastriesService.findByCommonStock(
            oldPastry.commonStock,
          );

          oldPastries.forEach(async (oldP: PastryDocument) => {
            const newP = await this.pastriesService.decrementStock(
              oldP as PastryDocument,
              pastriesGroupBy[oldPastry._id],
            );

            this.appGateway.stockChanged(code, {
              pastryId: oldP._id,
              newStock: newP.stock,
            });
          });
        } else {
          const pastry = await this.pastriesService.decrementStock(
            oldPastry as PastryDocument,
            pastriesGroupBy[oldPastry._id],
          );
          this.appGateway.stockChanged(code, {
            pastryId: oldPastry._id,
            newStock: pastry.stock,
          });
        }
      });

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
