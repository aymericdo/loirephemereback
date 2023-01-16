import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DEMO_RESTO,
  RestaurantsService,
} from 'src/restaurants/restaurants.service';
import { SharedRestaurantsService } from 'src/shared/services/shared-restaurants.service';
import { Access, User, UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class SharedUsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly sharedRestaurantsService: SharedRestaurantsService,
    private readonly restaurantsService: RestaurantsService,
  ) {}

  async findOne(id: string): Promise<UserDocument> {
    return await this.userModel.findById(id).exec();
  }

  async findOneByEmail(email: string): Promise<UserDocument> {
    return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
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
        { new: true },
      )
      .exec();
  }

  async hasAccess(
    id: string,
    code: string,
    accesses: Access[],
  ): Promise<boolean> {
    const currentUserAccess = await this.findCurrentAccess(id);
    const restaurantId = await this.sharedRestaurantsService.findIdByCode(code);
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
      return true;
    } else {
      return (
        (await this.restaurantsService.isUserInRestaurant(code, user._id)) &&
        (await this.hasAccess(user._id, code, accesses))
      );
    }
  }

  private async findCurrentAccess(
    id: string,
  ): Promise<{ [restaurantId: string]: Access[] }> {
    return (await this.userModel.findById(id, { access: 1 }).exec())?.access;
  }
}
