import { Controller, Get } from '@nestjs/common';
import { PastriesService } from './pastries.service';

@Controller()
export class PastriesController {
  constructor(private readonly pastriesService: PastriesService) {}

  @Get()
  getHello(): string {
    return this.pastriesService.getHello();
  }
}
