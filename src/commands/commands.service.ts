import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCommandDto } from './dto/create-command.dto';
import { CancelledByType, Command, CommandDocument, Discount } from './schemas/command.schema';
import { randomBytes } from 'crypto';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { PastriesService } from 'src/pastries/pastries.service';
import { SocketGateway } from 'src/notifications/gateways/web-socket.gateway';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { PaymentDto } from 'src/commands/dto/command-payment.dto';
import { isOpen, isPickupOpen } from 'src/shared/helpers/is-open';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';
import { PaymentsService } from 'src/payments/payments.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CommandsService extends SharedCommandsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Command.name) protected commandModel: Model<CommandDocument>,
    protected readonly restaurantsService: RestaurantsService,
    private readonly pastriesService: PastriesService,
    private readonly webPushGateway: WebPushGateway,
    private readonly socketGateway: SocketGateway,
  ) {
    super(commandModel, restaurantsService);
  }

  async isReferenceExists(reference: string): Promise<boolean> {
    return (
      (await this.commandModel
        .countDocuments({ reference: reference }, { limit: 1 })
        .exec()) === 1
    );
  }

  async create(
    restaurant: RestaurantDocument,
    createCommandDto: CreateCommandDto,
    notify = true,
  ): Promise<CommandDocument> {
    let reference: string;
    do {
      reference = randomBytes(24).toString('hex').toUpperCase().slice(0, 4);
    } while (await this.isReferenceExists(reference));

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
    });

    const savedCommand = await createdCommand.save();

    const newCommand = await this.commandModel
      .findById(new Types.ObjectId(savedCommand._id.toString()))
      .populate('restaurant')
      .populate('pastries')
      .exec();

    if (notify) {
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
    discount: Discount = null,
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
    return command;
  }

  async findByCodeForCommandsPage(
    code: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    return await this.commandModel
      .find({
        restaurant: new Types.ObjectId(restaurantId),
        $or: [
          {
            createdAt: {
              $gt: fromDate,
              $lte: toDate,
            },
          },
          {
            isDone: false,
          },
          {
            isPayed: false,
          },
        ],
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
      restaurant: new Types.ObjectId(restaurantId),
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

  async deleteAllByCode(code: string): Promise<void> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    await this.commandModel
      .deleteMany({ restaurant: new Types.ObjectId(restaurantId) })
      .exec();
  }

  reduceCountByPastryId(pastries: PastryDocument[]): {
    [pastryId: string]: number;
  } {
    return pastries.reduce((prev, pastry: PastryDocument) => {
      if (!prev.hasOwnProperty(pastry.id)) {
        prev[pastry.id] = 1;
      } else {
        prev[pastry.id] = prev[pastry.id] + 1;
      }
      return prev;
    }, {});
  }

  async pastriesReached0(countByPastryId: {
    [pastryId: string]: number;
  }): Promise<PastryDocument[]> {
    return await Object.keys(countByPastryId).reduce(
      async (previousValue, pastryId: string) => {
        const oldPastry: PastryDocument = await this.pastriesService.findOne(
          pastryId,
        );

        // null = infinity
        if (oldPastry.stock !== null) {
          if (oldPastry.stock - countByPastryId[pastryId] < 0) {
            (await previousValue).push(oldPastry);
          }
        }

        return previousValue;
      },
      Promise.resolve([] as PastryDocument[]),
    );
  }

  async paymentRequiredCommandCancellation(
    restaurant: RestaurantDocument,
    command: CommandDocument,
    countByPastryId: { [pastryId: string]: number; },
    cancelledBy: CancelledByType = 'payment',
  ): Promise<CommandDocument> {
    const updatedCommand = await this.cancelCommand(command.id, cancelledBy);
    this.stockManagement(countByPastryId, 'increment');
    
    const sessionId: string = await this.cacheManager.get(PaymentsService.cacheKey(command.id))

    if (sessionId) {
      const paymentsService = new PaymentsService(restaurant.paymentInformation.secretKey);
      paymentsService.expireSession(sessionId);
    }

    return updatedCommand;
  }

  async paymentRequiredManagement(
    restaurant: RestaurantDocument,
    command: CommandDocument,
    countByPastryId: { [pastryId: string]: number; },
  ): Promise<void> {
    if (restaurant.paymentInformation.paymentActivated && restaurant.paymentInformation.paymentRequired) {
      setTimeout(async () => {
        if (!(await this.isPayedByInternet(command.id))) {
          this.paymentRequiredCommandCancellation(restaurant, command, countByPastryId);
        }
      }, (5 * 60 * 1000) + 10000); // 5 minutes + 10 secondes
    }
  }

  async stockManagement(countByPastryId: {
    [pastryId: string]: number;
  }, type: 'increment' | 'decrement' = 'decrement'): Promise<void> {
    Object.keys(countByPastryId).forEach(async (pastryId) => {
      const currentPastry: PastryDocument = await this.pastriesService.findOne(
        pastryId,
      );

      if (type === 'decrement') {
        await this.pastriesService.decrementStock(
          currentPastry as PastryDocument,
          countByPastryId[currentPastry.id],
        );
      } else {
        await this.pastriesService.incrementStock(
          currentPastry as PastryDocument,
          countByPastryId[currentPastry.id],
        );
      }
    });
  }

  async isRestaurantOpened(
    restaurant: RestaurantDocument,
    pickupTime: Date = null,
  ): Promise<boolean> {
    if (isOpen(restaurant)) {
      return true;
    } else if (isPickupOpen(restaurant)) {
      return isOpen(restaurant, pickupTime);
    }

    return false;
  }

  async isPayedByInternet(commandId: string): Promise<boolean> {
    return (
      (await this.commandModel
        .countDocuments({ _id: commandId, isPayed: true, 'payment.key': 'internet' }, { limit: 1 })
        .exec()) === 1
    );
  }
}
