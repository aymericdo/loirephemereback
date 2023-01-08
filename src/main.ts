import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import helmet from 'helmet';
import webpush = require('web-push');
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      enableDebugMessages: process.env.ENVIRONMENT === 'dev',
    }),
  );

  const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
  const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

  webpush.setVapidDetails(
    'https://oresto.app/',
    publicVapidKey,
    privateVapidKey,
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
