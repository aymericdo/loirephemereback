import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { ACCESS_LIST, UserDocument } from 'src/users/schemas/user.schema';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { RestaurantEntity } from 'src/restaurants/serializer/restaurant.serializer';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('not-exists')
  async validateRestaurant(@Query('name') name: string): Promise<boolean> {
    return await this.restaurantsService.isNameNotExists(name);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
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

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/opening-time')
  async patchOpeningTime(
    @Param('code') code: string,
    @Body('openingTime')
    openingTime: {
      [weekDay: number]: { startTime: string; endTime: string };
    },
  ): Promise<RestaurantEntity> {
    if (
      Object.keys(openingTime).some((wd) => {
        const weekDayOpeningTime = openingTime[wd];

        return (
          (!weekDayOpeningTime.startTime && weekDayOpeningTime.endTime) ||
          (weekDayOpeningTime.startTime && !weekDayOpeningTime.endTime)
        );
      })
    ) {
      throw new BadRequestException({
        message: 'payload invalid',
      });
    }

    const restaurant = await this.restaurantsService.setOpeningTime(
      code,
      openingTime,
    );
    return new RestaurantEntity(restaurant.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/opening-pickup-time')
  async patchOpeningPickupTime(
    @Param('code') code: string,
    @Body('openingTime')
    openingTime: {
      [weekDay: number]: { startTime: string; endTime: string };
    },
  ): Promise<RestaurantEntity> {
    if (
      Object.keys(openingTime).some((wd) => {
        const weekDayOpeningTime = openingTime[wd];

        return (
          (!weekDayOpeningTime.startTime && weekDayOpeningTime.endTime) ||
          (weekDayOpeningTime.startTime && !weekDayOpeningTime.endTime)
        );
      })
    ) {
      throw new BadRequestException({
        message: 'payload invalid',
      });
    }

    const restaurant = await this.restaurantsService.setOpeningPickupTime(
      code,
      openingTime,
    );
    return new RestaurantEntity(restaurant.toObject());
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
    await this.usersService.updateAccess(
      authUser._id,
      [...ACCESS_LIST],
      restaurant._id,
    );

    return new RestaurantEntity(restaurant.toObject());
  }
}
