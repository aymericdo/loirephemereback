import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Command, CommandSchema } from 'src/commands/schemas/command.schema';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';

@Global()
@Module({
  imports: [
    RestaurantsModule,
    MongooseModule.forFeature([{ name: Command.name, schema: CommandSchema }]),
  ],
  providers: [SharedCommandsService],
  exports: [SharedCommandsService],
})
export class SharedModule {}
