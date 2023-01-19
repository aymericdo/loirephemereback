import { CommandsService } from 'src/commands/commands.service';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { PastriesService } from 'src/pastries/pastries.service';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { UsersService } from 'src/users/users.service';
import { faker } from '@faker-js/faker/locale/fr';
import { PASTRY_TYPES } from 'src/pastries/schemas/pastry.schema';
import { CreateCommandDto } from 'src/commands/dto/create-command.dto';
import { CommandPastryDto } from 'src/pastries/dto/command-pastry.dto';
import { Injectable } from '@nestjs/common';
import { SIZE } from 'src/shared/helpers/sizes';

@Injectable()
export class DemoRestoRefillService {
  private demoResto: RestaurantDocument;

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly pastriesService: PastriesService,
    private readonly commandsService: CommandsService,
    private readonly usersService: UsersService,
  ) {}

  async call(): Promise<void> {
    this.demoResto = await this.restaurantsService.findDemoResto();
    await this.refill();
  }

  private async refill(): Promise<void> {
    const user = await this.usersService.findDemoRestoUser();
    await this.restaurantsService.addUserToRestaurant(
      this.demoResto.code,
      user,
    );

    await this.createPastries();
    await this.createCommands();
  }

  private async createPastries(): Promise<void> {
    for (let i = 0; i < 10; ++i) {
      const pastry: CreatePastryDto = {
        name: (faker.commerce.product() + i).slice(0, SIZE.SMALL),
        description: faker.commerce.productDescription().slice(0, SIZE.LARGE),
        price: +faker.commerce.price(1, 20),
        imageUrl: null,
        ingredients: [
          faker.commerce.productMaterial(),
          faker.commerce.productMaterial(),
          faker.commerce.productMaterial(),
        ],
        hidden: false,
        stock: 10,
        type: faker.helpers.arrayElement([...PASTRY_TYPES]),
      };
      await this.pastriesService.create(this.demoResto, pastry);
    }
  }

  private async createCommands(): Promise<void> {
    for (let i = 0; i < 10; ++i) {
      const pastries = await this.pastriesService.findRandomByCode(
        this.demoResto.code,
        faker.helpers.arrayElement([2, 3, 4]),
      );

      const command: CreateCommandDto = {
        name: faker.name.firstName().slice(0, SIZE.SMALL),
        pastries: pastries.map(
          (pastry) =>
            ({
              ...pastry,
              id: pastry._id,
            } as CommandPastryDto),
        ),
        takeAway: faker.datatype.boolean(),
      };
      await this.commandsService.create(this.demoResto, command);
    }
  }
}
