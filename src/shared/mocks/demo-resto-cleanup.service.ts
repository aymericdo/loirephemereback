import { Injectable } from '@nestjs/common';
import { CommandsService } from 'src/commands/commands.service';
import { PastriesService } from 'src/pastries/pastries.service';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';

@Injectable()
export class DemoRestoCleanupService {
  private demoResto: RestaurantDocument;

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly pastriesService: PastriesService,
    private readonly commandsService: CommandsService,
  ) {}

  async call(): Promise<void> {
    this.demoResto = await this.restaurantsService.findDemoResto();
    await this.cleanUp();
  }

  private async cleanUp(): Promise<void> {
    await this.pastriesService.deleteAllByCode(this.demoResto.code);
    await this.commandsService.deleteAllByCode(this.demoResto.code);
    await this.restaurantsService.deleteAllUserByCode(this.demoResto.code);
  }
}
