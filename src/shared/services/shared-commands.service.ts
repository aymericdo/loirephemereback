import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Command, CommandDocument } from 'src/commands/schemas/command.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';

@Injectable()
export class SharedCommandsService {
  constructor(
    @InjectModel(Command.name) protected commandModel: Model<CommandDocument>,
    protected readonly restaurantsService: RestaurantsService,
  ) {}

  async findOne(id: string): Promise<CommandDocument> {
    return await this.commandModel
      .findById(id)
      .populate('pastries')
      .populate('restaurant')
      .exec();
  }

  async findByReference(reference: string): Promise<CommandDocument> {
    return await this.commandModel
      .findOne({ reference: reference })
      .populate('pastries')
      .populate('restaurant')
      .exec();
  }

  async addSessionId(id: string, sessionId: string): Promise<CommandDocument> {
    const command = await this.commandModel
      .findByIdAndUpdate(
        id,
        { sessionId },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .populate('restaurant')
      .exec();

    return command;
  }

  async hasCommandsRelatedToPastry(
    code: string,
    pastryId: string,
  ): Promise<boolean> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    return (
      (await this.commandModel
        .countDocuments({
          restaurant: restaurantId,
          pastries: pastryId,
        })
        .exec()) > 0
    );
  }
}
