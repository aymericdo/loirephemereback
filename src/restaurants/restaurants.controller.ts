import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('not-exists')
  async validateRestaurant(@Res() res, @Query() query) {
    const isValid = await this.restaurantsService.isNameNotExists(query.name);

    return res.status(HttpStatus.OK).json(isValid);
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllByUser(@Res() res, @Req() req) {
    const restaurants = await this.restaurantsService.findAllByUserId(
      req.user.userId,
    );

    return res.status(HttpStatus.OK).json(restaurants);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/')
  async postRestaurant(
    @Res() res,
    @Body() body: CreateRestaurantDto,
    @Req() req,
  ) {
    const restaurant = await this.restaurantsService.create(
      body,
      req.user.userId,
    );
    return res.status(HttpStatus.OK).json(restaurant);
  }
}
