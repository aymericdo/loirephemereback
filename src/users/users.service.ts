import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

export const USER_ORESTO = 'user@oresto.app';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

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

  private async encryptPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
