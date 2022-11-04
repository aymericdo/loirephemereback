import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { randomBytes } from 'crypto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.find().sort({ createdAt: 1 }).exec();
  }

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const reference = randomBytes(24).toString('hex').toUpperCase();
    const createdRestaurant = new this.restaurantModel({
      ...createRestaurantDto,
      reference: reference.slice(0, 4),
    });
    return (await createdRestaurant.save()).populate('pastries');
  }
}
