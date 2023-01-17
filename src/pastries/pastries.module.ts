import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageCleanerService } from 'src/pastries/cron/image-cleaner.service';
import { RestaurantsModule } from 'src/restaurants/restaurants.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { PastriesController } from './pastries.controller';
import { PastriesService } from './pastries.service';
import { Pastry, PastrySchema } from './schemas/pastry.schema';

@Module({
  imports: [
    NotificationsModule,
    RestaurantsModule,
    MongooseModule.forFeature([{ name: Pastry.name, schema: PastrySchema }]),
  ],
  controllers: [PastriesController],
  providers: [PastriesService, ImageCleanerService],
  exports: [PastriesService],
})
export class PastriesModule {}
