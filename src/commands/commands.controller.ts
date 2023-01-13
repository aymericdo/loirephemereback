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
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { CommandEntity } from 'src/commands/serializers/command.serializer';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { AuthorizationGuard } from 'src/shared/guards/authorization.guard';
import { Accesses } from 'src/shared/decorators/accesses.decorator';

@Controller('commands')
export class CommandsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly commandsService: CommandsService,
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
      throw err;
    } finally {
      transactionSession.endSession();
    }
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands', 'stats')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code')
  async getCommandsByCode(
    @Param('code') code: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ): Promise<CommandEntity[]> {
    const commands: CommandDocument[] = await this.commandsService.findByCode(
      code,
      fromDate,
      toDate,
    );

    return commands.map((command) => new CommandEntity(command.toObject()));
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/close/:id')
  async patchCommand(
    @Param('id') id: string,
    @Param('code') code: string,
  ): Promise<CommandEntity> {
    const commandRestaurantCode = (await this.commandsService.findOne(id))
      .restaurant.code;

    if (commandRestaurantCode !== code) {
      throw new BadRequestException({
        message: 'mismatch between command and restaurant',
      });
    }

    const command = await this.commandsService.closeCommand(id);
    return new CommandEntity(command.toObject());
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/payed/:id')
  async patchCommand2(
    @Param('id') id: string,
    @Param('code') code: string,
  ): Promise<CommandEntity> {
    const commandRestaurantCode = (await this.commandsService.findOne(id))
      .restaurant.code;

    if (commandRestaurantCode !== code) {
      throw new BadRequestException({
        message: 'mismatch between command and restaurant',
      });
    }

    const command = await this.commandsService.payedCommand(id);
    return new CommandEntity(command.toObject());
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code/notification')
  async postNotificationSub(
    @Body() body: { sub: PushSubscription },
    @Param('code') code: string,
  ): Promise<boolean> {
    this.webPushGateway.addAdminQueueSubNotification(code, body.sub);

    return true;
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code/notification/delete')
  async deleteNotificationSub(
    @Body() body: { sub: PushSubscription },
    @Param('code') code: string,
  ): Promise<boolean> {
    this.webPushGateway.deleteAdminQueueSubNotification(code, body.sub);

    return true;
  }
}
