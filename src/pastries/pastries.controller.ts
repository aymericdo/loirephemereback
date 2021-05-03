import { Controller, Get } from '@nestjs/common';
import { PastriesService } from './pastries.service';
import { Pastry } from './interfaces/pastry.interface';

@Controller('pastries')
export class PastriesController {
  constructor(private readonly pastriesService: PastriesService) {}

  @Get()
  findAll(): Pastry[] {
    return this.pastriesService.getAll();
  }
}
