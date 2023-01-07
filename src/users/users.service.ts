import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
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
    return await this.userModel.findOne({ _id: id }).exec();
  }

  async findOneByEmail(email: string): Promise<UserDocument> {
    return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
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

  async update(updateUserDto: UpdateUserDto): Promise<UserDocument> {
    return await this.userModel
      .findOneAndUpdate(
        { email: updateUserDto.email },
        {
          ...updateUserDto,
          password: await this.encryptPassword(updateUserDto.password),
        },
        { new: true },
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
        { new: true },
      )
      .exec();
  }

  async isAuthorized(user: UserDocument, code: string): Promise<boolean> {
    if (process.env.GOD_MODE.split('/').includes(user.email)) {
      return true;
    } else if (DEMO_RESTO === code) {
      return true;
    } else if (
      await this.restaurantsService.isUserInRestaurant(code, user._id)
    ) {
      return true;
    } else {
      return false;
    }
  }

  private async encryptPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
