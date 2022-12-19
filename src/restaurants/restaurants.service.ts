import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
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

  async findUsersByCodeCount(code: string): Promise<number> {
    return (
      await this.restaurantModel.findOne({ code: code }, { users: 1 }).exec()
    ).users.length;
  }

  async isUserInRestaurant(code: string, userId: string): Promise<boolean> {
    return (
      (await this.restaurantModel
        .countDocuments({ code: code, users: userId }, { limit: 1 })
        .exec()) === 0
    );
  }

  async isNameNotExists(name: string): Promise<boolean> {
    return (
      (await this.restaurantModel
        .countDocuments({ code: this.generateCode(name) }, { limit: 1 })
        .exec()) === 0
    );
  }

  async create(
    createRestaurantDto: CreateRestaurantDto,
    userId: string,
  ): Promise<RestaurantDocument> {
    const createdRestaurant = new this.restaurantModel({
      name: createRestaurantDto.name.trim(),
      code: this.generateCode(createRestaurantDto.name),
      users: [userId],
    });
    return await createdRestaurant.save();
  }

  async addUserToRestaurant(
    code: string,
    user: UserDocument,
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $addToSet: { users: user._id.toString() } },
        { new: true },
      )
      .exec();
  }

  async deleteUserToRestaurant(
    code: string,
    user: UserDocument,
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $pull: { users: user._id.toString() } },
        { new: true },
      )
      .exec();
  }

  private generateCode(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9- ]/g, '')
      .replace(' ', '-');
  }
}
