import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Command, CommandDocument } from 'src/commands/schemas/command.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';

@Injectable()
export class SharedCommandsService {
  constructor(
    @InjectModel(Command.name) private commandModel: Model<CommandDocument>,
    private readonly restaurantsService: RestaurantsService,
  ) {}

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
}
