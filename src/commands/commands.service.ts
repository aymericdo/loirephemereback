import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCommandDto } from './dto/create-command.dto';
import { Command, CommandDocument } from './schemas/command.schema';
import { randomBytes } from 'crypto';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { PastriesService } from 'src/pastries/pastries.service';
import { AppGateway } from 'src/app.gateway';

@Injectable()
export class CommandsService {
  constructor(
    @InjectModel(Command.name) private commandModel: Model<CommandDocument>,
    private readonly pastriesService: PastriesService,
    private readonly appGateway: AppGateway,
  ) {}

  async create(
    restaurant: RestaurantDocument,
    createCommandDto: CreateCommandDto,
  ): Promise<Command> {
    const reference: string = randomBytes(24)
      .toString('hex')
      .toUpperCase()
      .slice(0, 4);
    const createdCommand = new this.commandModel({
      ...createCommandDto,
      name: createCommandDto.name.trim(),
      reference,
      restaurant,
    });
    return (await createdCommand.save()).populate('pastries');
  }

  async closeCommand(id: string): Promise<Command> {
    return await this.commandModel
      .findByIdAndUpdate(
        id,
        { isDone: true },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .exec();
  }

  async payedCommand(id: string): Promise<Command> {
    return await this.commandModel
      .findByIdAndUpdate(
        id,
        { isPayed: true },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .exec();
  }

  async findAll(year = new Date().getFullYear()): Promise<Command[]> {
    return await this.commandModel
      .find({
        createdAt: {
          $gt: new Date(+year, 0, 1),
          $lte: new Date(+year + 1, 0, 1),
        },
      })
      .sort({ createdAt: 1 })
      .populate('pastries')
      .exec();
  }

  async findByCode(
    code: string,
    fromDate: string,
    toDate: string,
  ): Promise<Command[]> {
    return await this.commandModel
      .aggregate([
        {
          $lookup: {
            from: 'restaurants',
            localField: 'restaurant',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        {
          $match: {
            'restaurant.code': code,
            createdAt: {
              $gt: new Date(fromDate),
              $lte: new Date(toDate),
            },
          },
        },
        {
          $lookup: {
            from: 'pastries',
            localField: 'pastries',
            foreignField: '_id',
            as: 'pastries',
          },
        },
        {
          $sort: { createdAt: 1 },
        },
      ])
      .exec();
  }

  async findByPastry(code: string, pastryId: string): Promise<Command[]> {
    return await this.commandModel
      .aggregate([
        {
          $lookup: {
            from: 'restaurants',
            localField: 'restaurant',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        {
          $match: {
            'restaurant.code': code,
            pastries: new Types.ObjectId(pastryId),
          },
        },
        {
          $sort: { createdAt: 1 },
        },
      ])
      .exec();
  }

  reducePastriesById(pastries: PastryDocument[]): {
    [pastryId: string]: number;
  } {
    return pastries.reduce((prev, pastry: PastryDocument) => {
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

  pastriesReached0(pastriesGroupById: {
    [pastryId: string]: number;
  }): PastryDocument[] {
    return Object.keys(pastriesGroupById).reduce(
      async (prev: any, pastryId: string) => {
        const oldPastry: PastryDocument = await this.pastriesService.findOne(
          pastryId,
        );

        if (oldPastry.stock - pastriesGroupById[pastryId] < 0) {
          prev.push(oldPastry as PastryDocument);
        }
        return prev;
      },
      [] as PastryDocument[],
    );
  }

  stockManagement(
    code: string,
    pastriesGroupById: { [pastryId: string]: number },
  ): void {
    Object.keys(pastriesGroupById).forEach(async (pastryId) => {
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
            pastriesGroupById[oldPastry._id],
          );

          this.appGateway.stockChanged(code, {
            pastryId: oldP._id,
            newStock: newP.stock,
          });
        });
      } else {
        const pastry = await this.pastriesService.decrementStock(
          oldPastry as PastryDocument,
          pastriesGroupById[oldPastry._id],
        );
        this.appGateway.stockChanged(code, {
          pastryId: oldPastry._id,
          newStock: pastry.stock,
        });
      }
    });
  }
}
