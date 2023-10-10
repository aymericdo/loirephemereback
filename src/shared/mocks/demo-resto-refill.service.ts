import { CommandsService } from 'src/commands/commands.service';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { PastriesService } from 'src/pastries/pastries.service';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { UsersService } from 'src/users/users.service';
import { faker } from '@faker-js/faker/locale/fr';
import { CreateCommandDto } from 'src/commands/dto/create-command.dto';
import { CommandPastryDto } from 'src/pastries/dto/command-pastry.dto';
import { Injectable } from '@nestjs/common';
import { SIZE } from 'src/shared/helpers/sizes';
import { MOCK_PASTRIES } from 'src/shared/mocks/data';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Command, CommandDocument } from 'src/commands/schemas/command.schema';
import { getRandomInt } from 'src/shared/helpers/randomInt';

@Injectable()
export class DemoRestoRefillService {
  private demoResto: RestaurantDocument;

  constructor(
    @InjectModel(Command.name) private commandModel: Model<CommandDocument>,
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
    const pastries = MOCK_PASTRIES;
    for (let i = 0; i < pastries.length; ++i) {
      const pastry: CreatePastryDto = {
        name: pastries[i].name,
        description: pastries[i].description,
        price: pastries[i].price,
        imageUrl: pastries[i].imageUrl,
        ingredients: pastries[i].ingredients,
        hidden: false,
        stock: 10,
        type: pastries[i].type,
      };
      await this.pastriesService.create(this.demoResto, pastry);
    }
  }

  private async createCommands(): Promise<void> {
    for (let i = 0; i < 500; ++i) {
      const pastries = await this.pastriesService.findRandomByCode(
        this.demoResto.code,
        faker.helpers.arrayElement([2, 3, 4]),
      );

      const endOfToday = new Date();
      endOfToday.setUTCHours(23, 59, 59, 999);

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
        pickUpTime:
          getRandomInt(0, 5) === 0
            ? faker.date.between(Date(), endOfToday)
            : null,
      };
      const newCommand = await this.commandsService.create(
        this.demoResto,
        command,
        false,
      );

      if (i > 5) {
        await this.moveCommandInThePast(newCommand, faker.date.past());
      }
    }
  }

  private async moveCommandInThePast(
    command: CommandDocument,
    date: Date,
  ): Promise<void> {
    await this.commandModel
      .updateOne(
        { _id: command._id },
        {
          $set: {
            createdAt: date,
            updatedAt: date,
            isDone: true,
            isPayed: true,
          },
        },
        {
          new: true,
          timestamps: false,
          strict: false,
        },
      )
      .exec();
  }
}
