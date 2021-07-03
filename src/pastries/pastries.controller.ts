import { Body, Controller, Get, HttpStatus, Post, Res } from '@nestjs/common';
import { PastriesService } from './pastries.service';
import { Pastry } from './schemas/pastry.schema';
import webpush = require('web-push');

@Controller('pastries')
export class PastriesController {
  constructor(private readonly pastriesService: PastriesService) {}

  @Get()
  async getAll(@Res() res): Promise<Pastry[]> {
    const pastries = await this.pastriesService.findAll();
    return res.status(HttpStatus.OK).json(pastries);
  }

  @Post('notification')
  async postNotificationSub(@Res() res, @Body() sub: any) {
    // save sub
    res.status(HttpStatus.OK).json();

    const payload = JSON.stringify({
      notification: {
        title: 'La colone vendome',
        body: 'La meeeeeeer',
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [
          500,
          110,
          500,
          110,
          450,
          110,
          200,
          110,
          170,
          40,
          450,
          110,
          200,
          110,
          170,
          40,
          500,
        ],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
        },
      },
    });

    // Pass object into sendNotification
    webpush.sendNotification(sub, payload).catch((err) => console.error(err));
  }
}
