import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PastriesModule } from './pastries/pastries.module';
import { CommandsModule } from './commands/commands.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      serveRoot: '',
    }),
    PastriesModule,
    CommandsModule,
    RestaurantsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
