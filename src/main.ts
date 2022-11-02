import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import helmet from 'helmet';
import webpush = require('web-push');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(helmet());
  app.useWebSocketAdapter(new WsAdapter(app));

  const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
  const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

  webpush.setVapidDetails(
    'http://loirephemere.netlify.app/',
    publicVapidKey,
    privateVapidKey,
  );

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
