import {
  CacheModule,
  HttpException,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PastriesModule } from './pastries/pastries.module';
import { CommandsModule } from './commands/commands.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { ApiLoggerMiddleware } from 'src/shared/middlewares/api-logger.middleware';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { SentryInterceptor } from '@ntegral/nestjs-sentry';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      serveRoot: '',
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 30,
    }),
    SentryModule.forRoot({
      dsn: process.env.SENTRY_DNS,
      debug: false,
      environment: process.env.ENVIRONMENT,
      release: '1.0',
      logLevels: ['debug'],
    }),
    PastriesModule,
    CommandsModule,
    RestaurantsModule,
    UsersModule,
    AuthModule,
    MailModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () =>
        new SentryInterceptor({
          filters: [
            {
              type: HttpException,
              filter: (exception: HttpException) => 500 > exception.getStatus(),
            },
          ],
        }),
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiLoggerMiddleware).forRoutes('*');
  }
}
