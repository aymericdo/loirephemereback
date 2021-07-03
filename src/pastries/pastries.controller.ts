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
    console.log(sub);

    res.status(HttpStatus.OK).json();

    console.log('testouille');

    const payload = JSON.stringify({ title: 'Loirephemere yo' });

    // Pass object into sendNotification
    webpush.sendNotification(sub, payload).catch((err) => console.error(err));
  }
}
