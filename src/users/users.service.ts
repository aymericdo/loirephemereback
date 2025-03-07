import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { Access, User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import {
  DEMO_RESTO,
  RestaurantsService,
} from 'src/restaurants/restaurants.service';

export const USER_ORESTO = 'user@oresto.app';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async findOne(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id).exec();
  }

  async findOneByEmail(email: string): Promise<UserDocument> {
    return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findDemoRestoUser(): Promise<UserDocument> {
    return await this.findOneByEmail(USER_ORESTO);
  }

  async isEmailExists(email: string): Promise<boolean> {
    return (
      (await this.userModel
        .countDocuments({ email: email.toLowerCase() }, { limit: 1 })
        .exec()) === 1
    );
  }

  async isEmailNotExists(email: string): Promise<boolean> {
    return (
      (await this.userModel
        .countDocuments({ email: email.toLowerCase() }, { limit: 1 })
        .exec()) === 0
    );
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...createUserDto,
      email: createUserDto.email,
      password: await this.encryptPassword(createUserDto.password),
    });
    return await createdUser.save();
  }

  async updateAccess(
    id: string,
    access: Access[],
    restaurantId: string,
  ): Promise<UserDocument> {
    return await this.userModel
      .findByIdAndUpdate(
        id,
        {
          access: {
            ...(await this.findCurrentAccess(id)),
            [restaurantId]: access,
          },
        },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async removeAccessFromRestaurant(
    id: string,
    restaurantId: string,
  ): Promise<UserDocument> {
    const currentAccess = await this.findCurrentAccess(id);
    delete currentAccess[restaurantId];

    return await this.userModel
      .findByIdAndUpdate(
        id,
        {
          access: {
            ...currentAccess,
          },
        },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async updatePassword(
    userId: string,
    password: string,
  ): Promise<UserDocument> {
    return await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            password: await this.encryptPassword(password),
          },
        },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async setDisplayDemoResto(
    userId: string,
    displayDemoResto: boolean,
  ): Promise<UserDocument> {
    return await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            displayDemoResto,
          },
        },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async setWaiterMode(
    userId: string,
    waiterMode: boolean,
  ): Promise<UserDocument> {
    return await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            waiterMode,
          },
        },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  async hasAccess(
    id: string,
    code: string,
    accesses: Access[],
  ): Promise<boolean> {
    const currentUserAccess = await this.findCurrentAccess(id);
    const restaurantId = await this.restaurantsService.findIdByCode(code);
    return accesses.some((access) =>
      currentUserAccess[restaurantId].includes(access),
    );
  }

  async isAuthorized(
    user: UserDocument,
    code: string,
    accesses: Access[],
  ): Promise<boolean> {
    if (process.env.GOD_MODE.split('/').includes(user.email)) {
      return true;
    } else if (DEMO_RESTO === code) {
      if (
        !(await this.restaurantsService.isUserInRestaurant(
          code,
          user.id,
        ))
      ) {
        return true;
      } else {
        return await this.hasAccess(user.id, code, accesses);
      }
    } else {
      return (
        (await this.restaurantsService.isUserInRestaurant(
          code,
          user.id,
        )) && (await this.hasAccess(user.id, code, accesses))
      );
    }
  }

  private async findCurrentAccess(
    id: string,
  ): Promise<{ [restaurantId: string]: Access[] }> {
    return (await this.userModel.findById(id, { access: 1 }).exec())?.access;
  }

  private async encryptPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
