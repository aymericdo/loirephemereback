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
import { hourMinuteToDate } from 'src/shared/helpers/date';

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

    if (!restaurant) {
      throw new NotFoundException({
        message: 'resto not found',
      });
    }

    return new RestaurantEntity(restaurant.toObject());
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

    await this.restaurantsService.setOpeningTime(code, openingTime);

    const restaurant = await this.restaurantsService.cleanUpOpeningPickupTime(
      code,
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
    openingPickupTime: {
      [weekDay: number]: { startTime: string };
    },
  ): Promise<RestaurantEntity> {
    const restaurant = await this.restaurantsService.findByCode(code);

    if (
      Object.keys(openingPickupTime).some((wd) => {
        const weekDayOpeningPickupTime = openingPickupTime[wd].startTime;

        if (weekDayOpeningPickupTime) {
          const openingPickupHoursMinutes = weekDayOpeningPickupTime.split(':');
          const openingPickupStartTime = hourMinuteToDate(
            openingPickupHoursMinutes[0],
            openingPickupHoursMinutes[1],
          );

          const openingHoursMinutes =
            restaurant.openingTime[wd]?.startTime.split(':');
          const openingStartTime = hourMinuteToDate(
            openingHoursMinutes[0],
            openingHoursMinutes[1],
          );

          return openingPickupStartTime > openingStartTime;
        } else {
          return false;
        }
      })
    ) {
      throw new BadRequestException({
        message: 'payload invalid',
      });
    }

    const updatedRestaurant =
      await this.restaurantsService.setOpeningPickupTime(
        code,
        openingPickupTime,
      );
    return new RestaurantEntity(updatedRestaurant.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/display-stock')
  async patchDisplayStock(
    @Param('code') code: string,
    @Body('displayStock') displayStock: boolean,
  ): Promise<RestaurantEntity> {
    const restaurant = await this.restaurantsService.setDisplayStock(
      code,
      displayStock,
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
