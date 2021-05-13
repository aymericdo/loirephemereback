import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { PastriesService } from './pastries.service';

@Controller('pastries')
export class PastriesController {
  constructor(private readonly pastriesService: PastriesService) {}

  @Get()
  async findAll(@Res() res) {
    const pastries = await this.pastriesService.getAll();
    return res.status(HttpStatus.OK).json(pastries);
  }
}
