import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    )?.id;
  }

  async findUsersByCode(code: string): Promise<UserDocument[]> {
    return (
      await this.restaurantModel
        .findOne({ code }, { users: 1 })
        .populate('users')
        .exec()
    ).users as UserDocument[];
  }

  async findUsersCountByCode(code: string): Promise<number> {
    return (
      await this.restaurantModel.findOne({ code }, { users: 1 }).exec()
    ).users.length;
  }

  async deleteAllUserByCode(code: string): Promise<Restaurant> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code },
        { $set: { users: [] } },
        { new: true, useFindAndModify: false })
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
        { code },
        { $set: { openingTime: openingTime } },
        { new: true, useFindAndModify: false },
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
        prev[weekDay] = { startTime: null };
      } else {
        prev[weekDay] = restaurant.openingPickupTime[weekDay];
      }
      return prev;
    }, {});

    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { openingPickupTime: fixedOpeningPickupTime } },
        { new: true, useFindAndModify: false },
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
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async setRestaurantInformation(
    code: string,
    attributes: { timezone?: string, displayStock?: boolean },
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: attributes },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async setAlwaysOpen(
    code: string,
    alwaysOpen: boolean,
  ): Promise<RestaurantDocument> {
    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { alwaysOpen } },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async setPaymentInformation(
    code: string,
    type: string,
    paymentActivated: boolean,
    paymentRequired: boolean,
    publicKey: string,
    secretKey: string,
  ): Promise<RestaurantDocument> {
    const newData = {
      'paymentInformation.type': type,
      'paymentInformation.paymentActivated': paymentActivated,
      'paymentInformation.paymentRequired': paymentRequired,
    }

    if (publicKey) {
      newData['paymentInformation.publicKey'] = publicKey
    }

    if (secretKey) {
      newData['paymentInformation.secretKey'] = secretKey
    }

    return await this.restaurantModel
      .findOneAndUpdate(
        { code: code },
        { $set: { ...newData } },
        { new: true, useFindAndModify: false },
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
          { code: code, users: userId },
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
      isAlwaysOpen: true,
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
        { $addToSet: { users: user.id } },
        { new: true, useFindAndModify: false },
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
        { $pull: { users: user.id } },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async fullAccessForAllRestaurants(): Promise<{
    [restaurantId: string]: Access[];
  }> {
    const allRestaurantIds: string[] = (await this.findAll()).map(
      (restaurant) => restaurant.id,
    );

    return allRestaurantIds.reduce(
      (prev, id: string) => {
        prev[id] = [...ACCESS_LIST];
        return prev;
      },
      {} as {
        [restaurantId: string]: Access[];
      },
    );
  }

  async fullAccessForDemoResto(user: UserDocument): Promise<{
    [restaurantId: string]: Access[];
  }> {
    const demoRestaurantId = (await this.findDemoResto()).id;

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
