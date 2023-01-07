import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

@Injectable()
export class ApiLoggerMiddleware implements NestMiddleware {
  private logger: Logger = new Logger(ApiLoggerMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    this.logger.log(`${req.method} ${req.originalUrl}`);
    next();
  }
}
