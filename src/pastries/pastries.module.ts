import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppGateway } from 'src/app.gateway';
import { PastriesController } from './pastries.controller';
import { PastriesService } from './pastries.service';
import { Pastry, PastrySchema } from './schemas/pastry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pastry.name, schema: PastrySchema }]),
  ],
  controllers: [PastriesController],
  providers: [PastriesService, AppGateway],
  exports: [PastriesService],
})
export class PastriesModule {}
