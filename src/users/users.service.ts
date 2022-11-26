import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async findAllByCode(code: string): Promise<UserDocument[]> {
    return await this.userModel.aggregate([
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurant',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      {
        $match: { 'restaurant.code': code },
      },
      {
        $sort: {
          email: 1,
        },
      },
    ]);
  }

  async isValidEmail(email: string): Promise<boolean> {
    return (
      (await this.userModel
        .countDocuments({ email: email }, { limit: 1 })
        .exec()) === 0
    );
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...createUserDto,
      password: this.encryptPassword(createUserDto.password),
    });
    return await createdUser.save();
  }

  private encryptPassword(password: string): string {
    return password;
  }
}
