import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Access,
  ACCESS_LIST,
  UserDocument,
} from 'src/users/schemas/user.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';

export const DEMO_RESTO = 'demo-resto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async findAll(): Promise<RestaurantDocument[]> {
    return await this.restaurantModel.find().sort({ createdAt: 1 }).exec();
  }

  async findDemoResto(): Promise<RestaurantDocument> {
    return await this.findByCode(DEMO_RESTO);
  }

  async findAllByUserId(
    userId: string,
    concatDemoResto = false,
  ): Promise<RestaurantDocument[]> {
    let filter = {};
    if (concatDemoResto) {
      filter = { $or: [{ users: userId }, { code: DEMO_RESTO }] };
    } else {
      filter = { users: userId };
    }
    return await this.restaurantModel
      .find(filter)
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByCode(code: string): Promise<RestaurantDocument> {
    return await this.restaurantModel.findOne({ code: code }).exec();
  }

  async findIdByCode(code: string): Promise<string> {
    return (
      await this.restaurantModel.findOne({ code: code }, { _id: 1 }).exec()
    )?._id;
  }

  async findUsersByCode(code: string): Promise<UserDocument[]> {
    return (
      await this.restaurantModel
        .findOne({ code: code }, { users: 1 })
        .populate('users')
        .exec()
    ).users as UserDocument[];
  }

  async findUsersCountByCode(code: string): Promise<number> {
    return (
      await this.restaurantModel.findOne({ code: code }, { users: 1 }).exec()
    ).users.length;
  }

  async deleteAllUserByCode(code: string): Promise<Restaurant> {
    return await this.restaurantModel
      .findOneAndUpdate({ code: code }, { $set: { users: [] } }, { new: true })
      .exec();
  }

  async setOpeningTime(
    code: string,
    openingTime: {
      [weekDay: number]: { startTime: string; endTime: string };
    },
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { openingTime: openingTime } },
        { new: true },
      )
      .exec();
  }

  async cleanUpOpeningPickupTime(code: string): Promise<RestaurantDocument> {
    const restaurant = await this.restaurantModel
      .findOne({ code: code })
      .exec();

    const fixedOpeningPickupTime = Object.keys(
      restaurant.openingPickupTime,
    ).reduce((prev, weekDay) => {
      if (
        restaurant.openingPickupTime[weekDay].startTime >
        restaurant.openingTime[weekDay].startTime
      ) {
        prev[weekDay] = {
          startTime: restaurant.openingTime[weekDay].startTime,
        };
      } else {
        prev[weekDay] = restaurant.openingPickupTime[weekDay];
      }
      return prev;
    }, {});

    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { openingPickupTime: fixedOpeningPickupTime } },
        { new: true },
      )
      .exec();
  }

  async setOpeningPickupTime(
    code: string,
    openingTime: {
      [weekDay: number]: { startTime: string };
    },
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { openingPickupTime: openingTime } },
        { new: true },
      )
      .exec();
  }

  async setDisplayStock(
    code: string,
    displayStock: boolean,
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { displayStock } },
        { new: true },
      )
      .exec();
  }

  async isStockDisplayable(code: string): Promise<boolean> {
    return (await this.findByCode(code))?.displayStock;
  }

  async isUserInRestaurant(code: string, userId: string): Promise<boolean> {
    return (
      (await this.restaurantModel
        .countDocuments(
          { code: code, users: new Types.ObjectId(userId) },
          { limit: 1 },
        )
        .exec()) === 1
    );
  }

  async isCodeNotExists(code: string): Promise<boolean> {
    return (
      (await this.restaurantModel
        .countDocuments({ code: code }, { limit: 1 })
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

  async fullAccessForAllRestaurants(): Promise<{
    [restaurantId: string]: Access[];
  }> {
    const allRestaurantIds = (await this.findAll()).map(
      (restaurant) => restaurant._id,
    );

    return allRestaurantIds.reduce((prev, id) => {
      prev[id] = [...ACCESS_LIST];
      return prev;
    }, {});
  }

  async fullAccessForDemoResto(user: UserDocument): Promise<{
    [restaurantId: string]: Access[];
  }> {
    const demoRestaurantId = (await this.findDemoResto())._id;

    return {
      [demoRestaurantId]: [...ACCESS_LIST],
      ...user.toObject().access,
    };
  }

  private generateCode(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .replaceAll(/[^a-z0-9- ]/g, '')
      .replaceAll(' ', '-');
  }
}
