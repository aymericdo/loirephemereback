import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async findAllByUserId(userId: string): Promise<RestaurantDocument[]> {
    return await this.restaurantModel
      .find({ users: userId })
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByCode(code: string): Promise<RestaurantDocument> {
    return await this.restaurantModel.findOne({ code: code }).exec();
  }

  async findUsersByCode(code: string): Promise<User[]> {
    return (
      await this.restaurantModel
        .findOne({ code: code }, { users: 1 })
        .populate('users')
        .exec()
    ).users;
  }

  async isValidName(name: string): Promise<boolean> {
    return (
      (await this.restaurantModel
        .countDocuments({ code: this.generateCode(name) }, { limit: 1 })
        .exec()) === 0
    );
  }

  async create(
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<RestaurantDocument> {
    const createdRestaurant = new this.restaurantModel({
      name: createRestaurantDto.name.trim(),
      code: this.generateCode(createRestaurantDto.name),
    });
    return await createdRestaurant.save();
  }

  private generateCode(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9- ]/g, '')
      .replace(' ', '-');
  }
}
