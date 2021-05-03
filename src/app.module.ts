import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PastriesController } from './pastries/pastries.controller';
import { AppService } from './app.service';
import { PastriesService } from './pastries/pastries.service';

@Module({
  imports: [],
  controllers: [AppController, PastriesController],
  providers: [AppService, PastriesService],
})
export class AppModule {}
