import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CommandsService } from 'src/commands/commands.service';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';

@Injectable()
export class PersonalCommandGuard implements CanActivate {
  constructor(
      private readonly commandsService: CommandsService,
    ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { params } = context.switchToHttp().getRequest();

    const command: CommandDocument = (await this.commandsService.findOne(params.id))
    
    if (!command) {
      throw new NotFoundException({
        message: 'command not found',
      });
    }

    const restaurant: RestaurantDocument = command.restaurant;

    if (restaurant.code !== params.code) {
      throw new BadRequestException({
        message: 'mismatch between command and restaurant',
      });
    }

    const threeHoursAgo = new Date();
    // 3 hours ago in the past
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

    if (threeHoursAgo > command.createdAt) {
      throw new BadRequestException({
        message: 'command is too old to be modified',
      });
    }

    return true;
  }
}
