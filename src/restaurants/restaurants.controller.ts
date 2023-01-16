import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RestaurantEntity } from 'src/restaurants/serializer/restaurant.serializer';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { SharedUsersService } from 'src/shared/services/shared-users.service';
import { ACCESS_LIST, UserDocument } from 'src/users/schemas/user.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly sharedUsersService: SharedUsersService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('not-exists')
  async validateRestaurant(@Query('name') name: string): Promise<boolean> {
    return await this.restaurantsService.isNameNotExists(name);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code')
  async getRestaurant(@Param('code') code: string): Promise<RestaurantEntity> {
    const restaurant = await this.restaurantsService.findByCode(code);

    if (restaurant) {
      return new RestaurantEntity(restaurant.toObject());
    } else {
      throw new NotFoundException({
        message: 'resto not found',
      });
    }
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('demo-resto')
  async getDemoResto(): Promise<RestaurantEntity> {
    const restaurant = await this.restaurantsService.findDemoResto();
    return new RestaurantEntity(restaurant.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  async getAllByUser(
    @AuthUser() authUser: UserDocument,
  ): Promise<RestaurantEntity[]> {
    const restaurants = process.env.GOD_MODE.split('/').includes(authUser.email)
      ? await this.restaurantsService.findAll()
      : await this.restaurantsService.findAllByUserId(authUser._id, true);

    return restaurants.map(
      (restaurant) => new RestaurantEntity(restaurant.toObject()),
    );
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('/')
  async postRestaurant(
    @Body() body: CreateRestaurantDto,
    @AuthUser() authUser: UserDocument,
  ): Promise<RestaurantEntity> {
    const restaurant = await this.restaurantsService.create(body, authUser._id);

    // set initial access
    await this.sharedUsersService.updateAccess(
      authUser._id,
      [...ACCESS_LIST],
      restaurant._id,
    );

    return new RestaurantEntity(restaurant.toObject());
  }
}
