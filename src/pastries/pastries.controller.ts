import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { PastriesService } from './pastries.service';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { AppGateway } from 'src/app.gateway';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryEntity } from 'src/pastries/pastries.serializer';

@Controller('pastries')
export class PastriesController {
  constructor(
    private readonly pastriesService: PastriesService,
    private readonly restaurantsService: RestaurantsService,
    private readonly appGateway: AppGateway,
  ) {}

  @Get()
  async getDisplayable(@Res() res): Promise<PastryDocument[]> {
    const pastries = await this.pastriesService.findDisplayable();
    return res.status(HttpStatus.OK).json(pastries);
  }

  @Post('by-code/:code')
  async createPastry(
    @Res() res,
    @Body() body: CreatePastryDto,
    @Param('code') code,
  ): Promise<PastryDocument[]> {
    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);
    const pastry = await this.pastriesService.create(restaurant, body);
    return res.status(HttpStatus.OK).json(pastry);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code/all')
  async getAlls(@Param('code') code): Promise<PastryEntity[]> {
    const pastries = await this.pastriesService.findAllByCode(code);
    return pastries.map((p) => new PastryEntity(p));
  }

  @Get('by-code/:code')
  async getPastriesByCode(
    @Res() res,
    @Param('code') code,
  ): Promise<PastryDocument[]> {
    const pastries = await this.pastriesService.findDisplayableByCode(code);
    return res.status(HttpStatus.OK).json(pastries);
  }

  @Get('by-code/:code/validate')
  async validatePastryName(
    @Res() res,
    @Param('code') code: string,
    @Query() query: { name: string },
  ): Promise<PastryDocument[]> {
    const isValid = await this.pastriesService.isValid(code, query.name);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Post('notification')
  async postNotificationSub(
    @Res() res,
    @Body() body: { sub: any; commandId: string },
  ) {
    this.appGateway.addWaitingQueueSubNotification(body);

    res.status(HttpStatus.OK).json();
  }
}
