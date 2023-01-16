import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Restaurant,
  RestaurantDocument,
} from 'src/restaurants/schemas/restaurant.schema';

export const DEMO_RESTO = 'demo-resto';

@Injectable()
export class SharedRestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async findIdByCode(code: string): Promise<string> {
    return (
      await this.restaurantModel.findOne({ code: code }, { _id: 1 }).exec()
    )?._id;
  }
}
