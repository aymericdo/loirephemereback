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
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserDocument } from 'src/users/schemas/user.schema';
import { AuthUser } from 'src/shared/middleware/auth-user.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get('not-exists')
  async validateRestaurant(@Res() res, @Query('name') name: string) {
    const isValid = await this.restaurantsService.isNameNotExists(name);

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
  async getAllByUser(@Res() res, @AuthUser() authUser: UserDocument) {
    const restaurants = await this.restaurantsService.findAllByUserId(
      authUser._id,
    );

    return res.status(HttpStatus.OK).json(restaurants);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/')
  async postRestaurant(
    @Res() res,
    @Body() body: CreateRestaurantDto,
    @AuthUser() authUser: UserDocument,
  ) {
    const restaurant = await this.restaurantsService.create(body, authUser._id);
    return res.status(HttpStatus.OK).json(restaurant);
  }
}
