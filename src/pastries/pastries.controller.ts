import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { PastriesService } from './pastries.service';
import { Pastry } from './schemas/pastry.schema';

@Controller('pastries')
export class PastriesController {
  constructor(private readonly pastriesService: PastriesService) {}

  @Get()
  async getAll(@Res() res): Promise<Pastry[]> {
    const pastries = await this.pastriesService.findAll();
    return res.status(HttpStatus.OK).json(pastries);
  }
}
