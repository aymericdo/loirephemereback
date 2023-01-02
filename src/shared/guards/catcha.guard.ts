import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { verify } from 'hcaptcha';

@Injectable()
export class CaptchaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.ENVIRONMENT === 'dev') {
      return true;
    } else {
      const { body } = context.switchToHttp().getRequest();
      const data = await verify(process.env.HCAPTCHA_SECRET, body.captchaToken);

      if (!data.success) {
        throw new ForbiddenException({
          message: 'Captcha invalid',
        });
      }
    }

    return true;
  }
}
