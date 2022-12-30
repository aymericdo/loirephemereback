import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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
import { UsersService } from 'src/users/users.service';
import { CommandEntity } from 'src/commands/serializers/command.serializer';
import { CommandDocument } from 'src/commands/schemas/command.schema';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly commandsService: CommandsService,
    private readonly usersService: UsersService,
    private readonly pastriesService: PastriesService,
    private readonly webPushGateway: WebPushGateway,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('by-code/:code')
  async postCommand(
    @Body() body: CreateCommandDto,
    @Param('code') code: string,
  ): Promise<CommandEntity> {
    const countByPastryId: { [pastryId: string]: number } =
      this.commandsService.reduceCountByPastryId(body.pastries);

    if (
      !(await this.pastriesService.verifyAllPastriesRestaurant(
        code,
        Object.keys(countByPastryId),
      ))
    ) {
      throw new BadRequestException({
        message: 'mismatch between pastries and restaurant',
      });
    }

    const transactionSession = await this.connection.startSession();

    try {
      transactionSession.startTransaction();

      const restaurant: RestaurantDocument =
        await this.restaurantsService.findByCode(code);

      const pastriesToZero: PastryDocument[] =
        await this.commandsService.pastriesReached0(countByPastryId);

      if (pastriesToZero.length) {
        throw new UnprocessableEntityException({
          message: 'pastry out of stock',
          outOfStock: pastriesToZero,
        });
      }

      const command = await this.commandsService.create(restaurant, body);

      await this.commandsService.stockManagement(countByPastryId);

      transactionSession.commitTransaction();
      return new CommandEntity(command.toObject());
    } catch (err) {
      transactionSession.abortTransaction();
    } finally {
      transactionSession.endSession();
    }
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code')
  async getCommandsByCode(
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ): Promise<CommandEntity[]> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const commands: CommandDocument[] = await this.commandsService.findByCode(
      code,
      fromDate,
      toDate,
    );

    return commands.map((command) => new CommandEntity(command));
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('/close/:id')
  async patchCommand(
    @Param('id') id: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<CommandEntity> {
    const code = (await this.commandsService.findOne(id)).restaurant.code;

    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const command = await this.commandsService.closeCommand(id);
    return new CommandEntity(command.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('/payed/:id')
  async patchCommand2(
    @Param('id') id: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<CommandEntity> {
    const code = (await this.commandsService.findOne(id)).restaurant.code;

    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const command = await this.commandsService.payedCommand(id);
    return new CommandEntity(command.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('notification')
  async postNotificationSub(
    @Body() body: { sub: PushSubscription; code: string },
  ): Promise<boolean> {
    this.webPushGateway.addAdminQueueSubNotification(body);

    return true;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('notification/delete')
  async deleteNotificationSub(
    @Body() body: { sub: PushSubscription; code: string },
  ): Promise<boolean> {
    this.webPushGateway.deleteAdminQueueSubNotification(body);

    return true;
  }
}
