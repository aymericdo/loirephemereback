import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  async getAll(@Res() res) {
    const restaurants = await this.restaurantsService.findAll();

    return res.status(HttpStatus.OK).json(restaurants);
  }

  @Get('validate')
  async validateRestaurant(@Res() res, @Query() query) {
    const restaurants = await this.restaurantsService.isValid(query.name);

    return res.status(HttpStatus.OK).json(restaurants);
  }

  @Get('by-code/:code')
  async getRestaurant(@Res() res, @Param('code') code) {
    const restaurant = await this.restaurantsService.findByCode(code);

    if (restaurant) {
      return res.status(HttpStatus.OK).json(restaurant);
    } else {
      return res.status(HttpStatus.NOT_FOUND).json(null);
    }
  }

  @Post('/')
  async postRestaurant(@Res() res, @Body() body: CreateRestaurantDto) {
    const restaurant = await this.restaurantsService.create(body);
    return res.status(HttpStatus.OK).json(restaurant);
  }
}
