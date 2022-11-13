import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { SharedModule } from 'src/shared/shared.module';
import { PastriesController } from './pastries.controller';
import { PastriesService } from './pastries.service';
import { Pastry, PastrySchema } from './schemas/pastry.schema';

@Module({
  imports: [
    SharedModule,
    RestaurantsModule,
    MongooseModule.forFeature([{ name: Pastry.name, schema: PastrySchema }]),
  ],
  controllers: [PastriesController],
  providers: [PastriesService],
  exports: [PastriesService],
})
export class PastriesModule {}
