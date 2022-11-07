import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { PastriesService } from './pastries.service';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { AppGateway } from 'src/app.gateway';

@Controller('pastries')
export class PastriesController {
  constructor(
    private readonly pastriesService: PastriesService,
    private readonly appGateway: AppGateway,
  ) {}

  @Get()
  async getDisplayable(@Res() res): Promise<PastryDocument[]> {
    const pastries = await this.pastriesService.findDisplayable();
    return res.status(HttpStatus.OK).json(pastries);
  }

  @Get('everything')
  async getAll(@Res() res): Promise<PastryDocument[]> {
    const pastries = await this.pastriesService.findAll();
    return res.status(HttpStatus.OK).json(pastries);
  }

  @Get('by-code/:code')
  async getPastriesByCode(
    @Res() res,
    @Param('code') code,
  ): Promise<PastryDocument[]> {
    const pastries = await this.pastriesService.findDisplayableByCode(code);
    return res.status(HttpStatus.OK).json(pastries);
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
