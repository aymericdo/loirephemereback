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
import { Response } from 'express';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PastriesService } from 'src/pastries/pastries.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { UserDocument } from 'src/users/schemas/user.schema';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly commandsService: CommandsService,
    private readonly pastriesService: PastriesService,
    private readonly socketGateway: SocketGateway,
    private readonly webPushGateway: WebPushGateway,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Post(':code')
  async postCommand(
    @Res() res: Response,
    @Body() body: CreateCommandDto,
    @Param('code') code: string,
  ) {
    const pastriesGroupById: { [pastryId: string]: number } =
      this.commandsService.reducePastriesById(body.pastries);

    if (
      !(await this.pastriesService.verifyAllPastriesRestaurant(
        code,
        Object.keys(pastriesGroupById),
      ))
    ) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'mismatch between pastries and restaurant' });
    }

    const transactionSession = await this.connection.startSession();

    try {
      transactionSession.startTransaction();

      const restaurant: RestaurantDocument =
        await this.restaurantsService.findByCode(code);

      const pastriesToZero: PastryDocument[] =
        await this.commandsService.pastriesReached0(pastriesGroupById);

      if (pastriesToZero.length) {
        return res
          .status(HttpStatus.UNPROCESSABLE_ENTITY)
          .json({ outOfStock: pastriesToZero });
      }

      const command = await this.commandsService.create(restaurant, body);
      this.socketGateway.alertNewCommand(code, command);
      this.webPushGateway.alertNewCommand(code);

      await this.commandsService.stockManagement(code, pastriesGroupById);

      transactionSession.commitTransaction();
      return res.status(HttpStatus.OK).json(command);
    } catch (err) {
      transactionSession.abortTransaction();
    } finally {
      transactionSession.endSession();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-code/:code')
  async getCommandsByCode(
    @Res() res: Response,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const commands = await this.commandsService.findByCode(
      code,
      fromDate,
      toDate,
    );

    return res.status(HttpStatus.OK).json(commands);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/close/:id')
  async patchCommand(
    @Res() res: Response,
    @Param('id') id: string,
    @AuthUser() authUser: UserDocument,
  ) {
    const code = (await this.commandsService.findOne(id)).restaurant.code;

    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const command = await this.commandsService.closeCommand(id);
    this.socketGateway.alertCloseCommand(code, command as any);
    return res.status(HttpStatus.OK).json(command);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/payed/:id')
  async patchCommand2(
    @Res() res: Response,
    @Param('id') id: string,
    @AuthUser() authUser: UserDocument,
  ) {
    const code = (await this.commandsService.findOne(id)).restaurant.code;

    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const command = await this.commandsService.payedCommand(id);
    this.socketGateway.alertPayedCommand(code, command);
    return res.status(HttpStatus.OK).json(command);
  }

  @UseGuards(JwtAuthGuard)
  @Post('notification')
  async postNotificationSub(
    @Res() res: Response,
    @Body() body: { sub: PushSubscription; code: string },
  ) {
    this.webPushGateway.addAdminQueueSubNotification(body);

    return res.status(HttpStatus.OK).json();
  }

  @UseGuards(JwtAuthGuard)
  @Post('notification/delete')
  async deleteNotificationSub(
    @Res() res: Response,
    @Body() body: { sub: PushSubscription; code: string },
  ) {
    this.webPushGateway.deleteAdminQueueSubNotification(body);

    return res.status(HttpStatus.OK).json();
  }
}
