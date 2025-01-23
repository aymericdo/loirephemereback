import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PushSubscription } from 'web-push';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PastriesService } from 'src/pastries/pastries.service';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { CommandEntity } from 'src/commands/serializers/command.serializer';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { AuthorizationGuard } from 'src/shared/guards/authorization.guard';
import { Accesses } from 'src/shared/decorators/accesses.decorator';
import { CommandDateRangeDto } from 'src/commands/dto/command-date-range.dto';
import { CommandDateRangeLast24hoursDto } from 'src/commands/dto/command-date-range-last-24-hours.dto';
import { CommandPaymentDto } from 'src/commands/dto/command-payment.dto';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { UserDocument } from 'src/users/schemas/user.schema';
import { PaymentsService } from 'src/payments/payments.service';
import { PersonalCommandGuard } from 'src/commands/guards/personal-command.guard';

@Controller('commands')
export class CommandsController {
  private logger: Logger = new Logger(CommandsController.name);

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly commandsService: CommandsService,
    private readonly pastriesService: PastriesService,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('by-code/:code')
  async postCommand(
    @Body() body: CreateCommandDto,
    @Param('code') code: string,
  ): Promise<CommandEntity> {
    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);

    if (!restaurant.isRestaurantOpened(body.pickUpTime)) {
      throw new ForbiddenException({
        message: 'restaurant is closed',
      });
    }

    const currentPastryIds = [...new Set(body.pastries.map((pastry) => pastry.id))];

    const allCurrentPastriesAreFromTheCurrentRestaurant = await this.pastriesService.verifyAllPastriesRestaurant(
      code,
      currentPastryIds,
    )

    if (!allCurrentPastriesAreFromTheCurrentRestaurant) {
      throw new BadRequestException({
        message: 'mismatch between pastries and restaurant',
      });
    }

    const deactivatedPastries: PastryDocument[] = await this.pastriesService.hiddenPastries(currentPastryIds);

    if (deactivatedPastries.length) {
      throw new UnprocessableEntityException({
        message: 'pastry deactivated',
        deactivated: deactivatedPastries,
      });
    }

    const command = await this.commandsService.create(restaurant, body);

    this.commandsService.paymentRequiredManagement(command);

    return new CommandEntity(command.toObject());
  }

  @UseGuards(PersonalCommandGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code/personal-command/:id')
  async getPersonalCommand(
    @Param('id') id: string,
  ): Promise<CommandEntity> {
    const command: CommandDocument = (await this.commandsService.findOne(id))
    return new CommandEntity(command.toObject());
  }

  @UseGuards(PersonalCommandGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Delete('by-code/:code/personal-command/:id')
  async cancelPersonalCommand(
    @Param('id') id: string,
  ): Promise<CommandEntity> {
    const command: CommandDocument = (await this.commandsService.findOne(id))

    if (!command.paymentRequired) {
      throw new BadRequestException({
        message: 'payment is not required',
      });
    }

    if (command.isCancellable) {
      throw new BadRequestException({
        message: 'command is not cancellable anymore',
      });
    }

    const updatedCommand = await this.commandsService.paymentRequiredCommandCancellation(
      command.id,
      'client',
    );

    return new CommandEntity(updatedCommand.toObject());
  }

  @UseGuards(PersonalCommandGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch('by-code/:code/personal-command/:id/mark-as-payed')
  async markPersonalCommandAsPayed(
    @Param('id') id: string,
    @Body('sessionId') sessionId: string,
  ): Promise<CommandEntity> {
    const command: CommandDocument = (await this.commandsService.findOne(id))
    const restaurant: RestaurantDocument = command.restaurant;

    if (!command.paymentRequired) {
      throw new BadRequestException({
        message: 'payment is not required',
      });
    }

    if (command.sessionId !== sessionId) {
      throw new BadRequestException({
        message: 'sessionId is not valid',
      });
    }

    try {
      const paymentsService = new PaymentsService(restaurant.paymentInformation.secretKey);
      const session = await paymentsService.getSession(sessionId);
      if (session.status === 'complete') {
        const updatedCommand = await this.commandsService.payByInternetCommand(command);
        return new CommandEntity(updatedCommand.toObject());
      } else {
        throw new Error;
      }
    } catch (err) {
      this.logger.error(err)

      throw new UnprocessableEntityException({
        message: 'command not payed',
        stripe: true,
      });
    }
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code')
  async getCommandsByCode(
    @Param('code') code: string,
    @Query() { fromDate, toDate }: CommandDateRangeLast24hoursDto,
  ): Promise<CommandEntity[]> {
    const commands: CommandDocument[] =
      await this.commandsService.findByCodeForCommandsPage(
        code,
        fromDate,
        toDate,
      );

    return commands.map((command) => new CommandEntity(command.toObject()));
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('stats')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/stats')
  async getCommandsByCodeForStats(
    @Param('code') code: string,
    @Query() { fromDate, toDate }: CommandDateRangeDto,
  ): Promise<CommandEntity[]> {
    const commands: CommandDocument[] = await this.commandsService.findByCode(
      code,
      fromDate,
      toDate,
      { isCancelled: false },
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
  async closeCommand(
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
  @Patch('by-code/:code/cancel/:id')
  async cancelCommand(
    @Param('id') id: string,
    @Param('code') code: string,
  ): Promise<CommandEntity> {
    const oldCommand = await this.commandsService.findOne(id);

    const commandRestaurantCode = oldCommand.restaurant.code;

    if (commandRestaurantCode !== code) {
      throw new BadRequestException({
        message: 'mismatch between command and restaurant',
      });
    }

    if (oldCommand.isCancellable) {
      throw new BadRequestException({
        message: 'command is not cancellable anymore',
      });
    }

    const command = await this.commandsService.cancelCommand(id, 'admin');

    return new CommandEntity(command.toObject());
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('commands')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/payed/:id')
  async payCommand(
    @Param('id') id: string,
    @Param('code') code: string,
    @Body() body: CommandPaymentDto,
  ): Promise<CommandEntity> {
    const oldCommand = await this.commandsService.findOne(id);
    const commandRestaurantCode = oldCommand.restaurant.code;

    if (commandRestaurantCode !== code) {
      throw new BadRequestException({
        message: 'mismatch between command and restaurant',
      });
    }

    if (oldCommand.isCancelled) {
      throw new BadRequestException({
        message: 'command is not payable anymore',
      });
    }

    const totalPayed = body.payments.reduce((prev, p) => p.value + prev, 0);
    const toPayed = body.discount
      ? body.discount.newPrice
      : oldCommand.totalPrice;

    if (totalPayed < toPayed) {
      throw new BadRequestException({
        message: 'mismatch between the total price and the payment',
      });
    }

    const command = await this.commandsService.payCommand(
      id,
      body.payments,
      { discount: body.discount },
    );
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
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    this.webPushGateway.addAdminQueueSubNotification(code, authUser.id, body.sub);

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
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    this.webPushGateway.deleteAdminQueueSubNotification(code, authUser.id);

    return true;
  }
}
