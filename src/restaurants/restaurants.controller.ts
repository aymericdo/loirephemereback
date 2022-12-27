import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserDocument } from 'src/users/schemas/user.schema';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('not-exists')
  async validateRestaurant(@Res() res: Response, @Query('name') name: string) {
    const isValid = await this.restaurantsService.isNameNotExists(name);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Get('by-code/:code')
  async getRestaurant(@Res() res: Response, @Param('code') code) {
    const restaurant = await this.restaurantsService.findByCode(code);

    if (restaurant) {
      return res.status(HttpStatus.OK).json(restaurant);
    } else {
      return res.status(HttpStatus.NOT_FOUND).json(null);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllByUser(@Res() res: Response, @AuthUser() authUser: UserDocument) {
    const restaurants = process.env.GOD_MODE.split('/').includes(authUser.email)
      ? await this.restaurantsService.findAll()
      : await this.restaurantsService.findAllByUserId(authUser._id, true);

    return res.status(HttpStatus.OK).json(restaurants);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/')
  async postRestaurant(
    @Res() res: Response,
    @Body() body: CreateRestaurantDto,
    @AuthUser() authUser: UserDocument,
  ) {
    const restaurant = await this.restaurantsService.create(body, authUser._id);
    return res.status(HttpStatus.OK).json(restaurant);
  }
}
