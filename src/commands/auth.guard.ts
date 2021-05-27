import { CanActivate } from '@nestjs/common';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs/internal/Observable';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.password;
    if (token === process.env.PASSWORD) return true;
  }
}
