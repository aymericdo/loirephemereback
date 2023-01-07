import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthorizationGuard extends JwtAuthGuard implements CanActivate {
  constructor(
    private usersService: UsersService,
    private restaurantsService: RestaurantsService,
    protected readonly reflector: Reflector,
  ) {
    super(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!(await super.canActivate(context))) {
      return false;
    }

    const { params, user } = context.switchToHttp().getRequest();

    if (
      !params.code ||
      (await this.restaurantsService.isCodeNotExists(params.code))
    ) {
      throw new NotFoundException({
        message: 'resto not found',
      });
    }

    if (!(await this.usersService.isAuthorized(user.authUser, params.code))) {
      throw new ForbiddenException({
        message: 'user not in restaurant',
      });
    }

    return true;
  }
}
