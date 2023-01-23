import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCommandDto } from './dto/create-command.dto';
import { Command, CommandDocument } from './schemas/command.schema';
import { randomBytes } from 'crypto';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { PastriesService } from 'src/pastries/pastries.service';
import { SocketGateway } from 'src/notifications/gateways/web-socket.gateway';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { CommandPastryDto } from 'src/pastries/dto/command-pastry.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';

@Injectable()
export class CommandsService {
  constructor(
    @InjectModel(Command.name) private commandModel: Model<CommandDocument>,
    private readonly restaurantsService: RestaurantsService,
    private readonly pastriesService: PastriesService,
    private readonly webPushGateway: WebPushGateway,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findOne(id: string): Promise<CommandDocument> {
    return await this.commandModel
      .findOne({ _id: id })
      .populate('pastries')
      .populate('restaurant')
      .exec();
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
      .findById(new Types.ObjectId(savedCommand._id))
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

  async payedCommand(id: string): Promise<CommandDocument> {
    const command = await this.commandModel
      .findByIdAndUpdate(
        id,
        { isPayed: true },
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
  ): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    return await this.commandModel
      .find({
        restaurant: new Types.ObjectId(restaurantId),
        createdAt: {
          $gt: fromDate,
          $lte: toDate,
        },
      })
      .populate('pastries')
      .populate('restaurant')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByPastry(
    code: string,
    pastryId: string,
  ): Promise<CommandDocument[]> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    return await this.commandModel
      .find({
        restaurant: new Types.ObjectId(restaurantId),
        pastries: new Types.ObjectId(pastryId),
      })
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

  reduceCountByPastryId(pastries: CommandPastryDto[]): {
    [pastryId: string]: number;
  } {
    return pastries.reduce((prev, pastry: CommandPastryDto) => {
      if (pastry.stock === undefined || pastry.stock === null) {
        return prev;
      }

      if (!prev.hasOwnProperty(pastry._id)) {
        prev[pastry._id.toString()] = 1;
      } else {
        prev[pastry._id.toString()] = prev[pastry._id] + 1;
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

        if (oldPastry.stock - countByPastryId[pastryId] < 0) {
          (await previousValue).push(oldPastry);
        }

        return previousValue;
      },
      Promise.resolve([] as PastryDocument[]),
    );
  }

  async stockManagement(countByPastryId: {
    [pastryId: string]: number;
  }): Promise<void> {
    Object.keys(countByPastryId).forEach(async (pastryId) => {
      const currentPastry: PastryDocument = await this.pastriesService.findOne(
        pastryId,
      );

      await this.pastriesService.decrementStock(
        currentPastry as PastryDocument,
        countByPastryId[currentPastry._id],
      );
    });
  }
}
