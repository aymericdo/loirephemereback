import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCommandDto } from './dto/create-command.dto';
import { CancelledByType, Command, CommandDocument, Discount } from './schemas/command.schema';
import { randomBytes } from 'crypto';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastriesService } from 'src/pastries/pastries.service';
import { SocketGateway } from 'src/notifications/gateways/web-socket.gateway';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PaymentDto } from 'src/commands/dto/command-payment.dto';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';
import { PaymentsService } from 'src/payments/payments.service';
import { CommandPastryDto } from 'src/pastries/dto/command-pastry.dto';
import Stripe from 'stripe';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class CommandsService extends SharedCommandsService {

  constructor(
    @InjectModel(Command.name) protected commandModel: Model<CommandDocument>,
    protected readonly restaurantsService: RestaurantsService,
    private readonly pastriesService: PastriesService,
    private readonly webPushGateway: WebPushGateway,
    private readonly socketGateway: SocketGateway,
    private readonly mailService: MailService,
  ) {
    super(commandModel, restaurantsService);
  }

  async create(
    restaurant: RestaurantDocument,
    createCommandDto: CreateCommandDto,
    { notify }: { notify: boolean } = { notify: true },
  ): Promise<CommandDocument> {
    const pastryIds = createCommandDto.pastries.map((pastry: CommandPastryDto) => pastry.id);
    const countByPastryId: { [pastryId: string]: number } = this.reduceCountByPastryId(pastryIds);
    await this.stockManagement(countByPastryId, { type: 'decrement' });

    const savedCommand = await this.createCommandAndSave(createCommandDto, restaurant)

    const newCommand: CommandDocument = await this.findOne(savedCommand.id);

    if (notify && !newCommand.paymentRequired) {
      this.socketGateway.alertNewCommand(restaurant.code, newCommand);
      this.webPushGateway.alertNewCommand(restaurant.code);
    }

    return newCommand;
  }

  async closeCommand(id: string): Promise<CommandDocument> {
    const command = await this.commandModel
      .findByIdAndUpdate(
        id,
        { isDone: true },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .populate('restaurant')
      .exec();

    this.socketGateway.alertCloseCommand(command.restaurant.code, command);

    return command;
  }

  async mergeCommand(code: string, commandIds: string[]): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);
    await this.commandModel
      .updateMany(
        {
          restaurant: restaurantId,
          _id: { $in: commandIds.map((id) => new Types.ObjectId(id)) },
        }, {
          $set: {
            mergedCommandIds: commandIds,
          },
        },
      )
      .exec();

    return await this.commandModel.find({
      restaurant: restaurantId,
      _id: { $in: commandIds.map((id) => new Types.ObjectId(id)) },
    })
      .populate('pastries')
      .populate('restaurant')
      .exec();
  }

  async splitCommand(code: string, commandIds: string[]): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);
    await this.commandModel
      .updateMany(
        {
          restaurant: restaurantId,
          _id: { $in: commandIds.map((id) => new Types.ObjectId(id)) },
        }, {
          $unset: {
            mergedCommandIds: 1,
          },
        },
      )
      .exec();

    return await this.commandModel.find({
      restaurant: restaurantId,
      _id: { $in: commandIds.map((id) => new Types.ObjectId(id)) },
    })
      .populate('pastries')
      .populate('restaurant')
      .exec();
  }

  async cancelCommand(id: string, cancelledBy: CancelledByType): Promise<CommandDocument> {
    const command = await this.commandModel
      .findByIdAndUpdate(
        id,
        { isCancelled: true, cancelledBy },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .populate('restaurant')
      .exec();

    this.socketGateway.alertCloseCommand(command.restaurant.code, command);

    return command;
  }

  async payByInternetCommand(command: CommandDocument) {
    return this.payCommand(command.id, [{
      key: 'internet',
      value: command.totalPrice,
    }]);
  }

  async payCommand(
    id: string,
    payment: PaymentDto[],
    { discount }: { discount: Discount } = { discount: null },
  ): Promise<CommandDocument> {
    const command = await this.commandModel
      .findByIdAndUpdate(
        id,
        { isPayed: true, payment, discount },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .populate('restaurant')
      .exec();

    this.socketGateway.alertPayedCommand(command.restaurant.code, command);

    if (command.paymentRequired) {
      this.socketGateway.alertNewCommand(command.restaurant.code, command);
      this.webPushGateway.alertNewCommand(command.restaurant.code);
    }

    return command;
  }

  async findByCodeForCommandsPage(
    code: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    const orFilter = {
      $or: [
        { createdAt: { $gt: fromDate, $lte: toDate } },
        { isDone: false },
        { isPayed: false },
      ],
    }

    return await this.commandModel
      .find({
        restaurant: restaurantId,
        $or: [{
          $and: [{
            paymentRequired: false,
            ...orFilter,
          }],
        }, {
          $and: [{
            paymentRequired: true,
            isPayed: true,
            ...orFilter,
          }],
        }]
      })
      .populate('pastries')
      .populate('restaurant')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByCode(
    code: string,
    fromDate: Date,
    toDate: Date,
    options: {
      isCancelled: boolean
    } = null,
  ): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    let filter = {
      restaurant: restaurantId,
      createdAt: {
        $gt: fromDate,
        $lte: toDate,
      },
    }

    if (options) {
      filter = {
        ...filter,
        ...options,
      }
    }

    return await this.commandModel
      .find(filter)
      .populate('pastries')
      .populate('restaurant')
      .sort({ createdAt: 1 })
      .exec();
  }

  async countByCode(
    code: string,
  ): Promise<number> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    return await this.commandModel
      .countDocuments({ restaurant: restaurantId })
      .exec();
  }

  async payedCommandsCountByCode(
    code: string,
  ): Promise<number> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    return await this.commandModel
      .countDocuments({ restaurant: restaurantId, isPayed: true })
      .exec();
  }

  async paymentRequiredCommandCancellation(
    commandId: string,
    cancelledBy: CancelledByType = 'payment',
  ): Promise<CommandDocument> {
    try {
      const currentCommand = await this.findOne(commandId);
      const countByPastryId: { [pastryId: string]: number } =
        this.reduceCountByPastryId(currentCommand.pastries.map((pastry) => pastry.id));

      const sessionId = currentCommand.sessionId;

      if (sessionId) {
        const paymentsService = new PaymentsService(currentCommand.restaurant.paymentInformation.secretKey);

        const session = await paymentsService.getSession(sessionId);
        if (session.status === 'complete') {
          await this.payByInternetCommand(currentCommand);
          await this.sendPaymentSuccessEmail(paymentsService, session, currentCommand);

          throw new Error;
        } else {
          await paymentsService.expireSession(sessionId);
        }
      }

      const updatedCommand = await this.cancelCommand(commandId, cancelledBy);
      await this.stockManagement(countByPastryId, { type: 'increment' });

      return updatedCommand;
    } catch (error) {
      throw new UnprocessableEntityException({
        message: 'command not cancelled',
        error,
      });
    }
  }

  async sendPaymentSuccessEmail(
    paymentsService: PaymentsService,
    session: Stripe.Response<Stripe.Checkout.Session>,
    command: Command,
  ): Promise<void> {
    const receiptUrl = await paymentsService.getReceiptUrl(session);
    const email = paymentsService.getEmail(session);

    await this.mailService.sendPaymentInformation(
      email,
      receiptUrl,
      command,
    )
  }

  paymentRequiredManagement(command: CommandDocument): void {
    if (command.paymentRequired) {
      setTimeout(async () => {
        if (!(await this.isPayedByInternet(command.id))) {
          this.paymentRequiredCommandCancellation(command.id);
        }
      }, (5 * 60 * 1000) + 10000); // 5 minutes + 10 secondes
    }
  }

  async isPayedByInternet(commandId: string): Promise<boolean> {
    return (
      (await this.commandModel
        .countDocuments({ _id: commandId, isPayed: true, 'payment.key': 'internet' }, { limit: 1 })
        .exec()) === 1
    );
  }

  async oldPaymentRequiredPendingCommands(): Promise<CommandDocument[]> {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    return await this.commandModel
      .find({
        paymentRequired: true,
        isPayed: false,
        isCancelled: false,
        createdAt: { $lte: tenMinutesAgo}
      }).populate('restaurant').exec();
  }

  async deleteAllByCode(code: string): Promise<void> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    await this.commandModel
      .deleteMany({ restaurant: restaurantId })
      .exec();
  }

  private async createCommandAndSave(createCommandDto: CreateCommandDto, restaurant: RestaurantDocument): Promise<CommandDocument> {
    let newCommand = null;

    do {
      const reference = randomBytes(24).toString('hex').toUpperCase().slice(0, 4);

      try {
        const createdCommand = new this.commandModel({
          pastries: createCommandDto.pastries,
          takeAway: createCommandDto.takeAway,
          pickUpTime: createCommandDto.pickUpTime,
          name: createCommandDto.name.trim(),
          totalPrice: createCommandDto.pastries.reduce((prev, pastry) => {
            return prev + pastry.price;
          }, 0),
          reference,
          restaurant,
          paymentRequired: restaurant.paymentRequired(),
        });
        
        newCommand = await createdCommand.save();
      } catch (err) {
        if (err.code === 11000) {
          // retry
        } else {
          throw err
        }
      }
    } while (!newCommand)

    return newCommand;
  }

  private reduceCountByPastryId(pastryIds: string[]): {
    [pastryId: string]: number;
  } {
    return pastryIds.reduce((prev, pastryId: string) => {
      if (!prev.hasOwnProperty(pastryId)) {
        prev[pastryId] = 1;
      } else {
        prev[pastryId] = prev[pastryId] + 1;
      }
      return prev;
    }, {});
  }

  private async stockManagement(
    countByPastryId: { [pastryId: string]: number; },
    { type }: { type: 'increment' | 'decrement' },
  ): Promise<void> {
    let pastriesToZero = [];
    for (let pastryId of Object.keys(countByPastryId)) {
      try {
        if (type === 'decrement') {
          await this.pastriesService.incrementStock(
            pastryId,
            countByPastryId[pastryId] * -1,
          );
        } else {
          await this.pastriesService.incrementStock(
            pastryId,
            countByPastryId[pastryId],
          );
        }
      } catch (error) {
        if (error.code === 'out_of_stock') {
          pastriesToZero.push(error.pastry);
        }
      }
    }

    if (pastriesToZero.length) {
      throw new UnprocessableEntityException({
        message: 'pastry out of stock',
        outOfStock: pastriesToZero,
      });
    }
  }
}
