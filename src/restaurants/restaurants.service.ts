import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.find().sort({ createdAt: 1 }).exec();
  }

  async isValid(name: string): Promise<boolean> {
    return (
      (await this.restaurantModel.countDocuments({ name: name }).exec()) == 0
    );
  }

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const createdRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
    });
    return await createdRestaurant.save();
  }
}
