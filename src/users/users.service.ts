import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async findOne(id: string): Promise<UserDocument | undefined> {
    return await this.userModel.findOne({ _id: id }).exec();
  }

  async findOneByEmail(email: string): Promise<UserDocument | undefined> {
    return await this.userModel.findOne({ email: email }).exec();
  }

  async isEmailExists(email: string): Promise<boolean> {
    return (
      (await this.userModel
        .countDocuments({ email: email }, { limit: 1 })
        .exec()) === 1
    );
  }

  async isEmailNotExists(email: string): Promise<boolean> {
    return (
      (await this.userModel
        .countDocuments({ email: email }, { limit: 1 })
        .exec()) === 0
    );
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...createUserDto,
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

  private async encryptPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return await bcrypt.hash(password, saltOrRounds);
  }
}
