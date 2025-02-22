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
import { Access } from 'src/users/schemas/user.schema';

@Injectable()
export class AuthorizationGuard extends JwtAuthGuard implements CanActivate {
  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
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

    const accesses =
      this.reflector.get<Access[]>('accesses', context.getHandler()) || [];

    if (!accesses.length) return true

    if (
      !(await this.usersService.isAuthorized(
        user.authUser,
        params.code,
        accesses,
      ))
    ) {
      throw new ForbiddenException({
        message: 'user access not granted in restaurant',
      });
    }

    return true;
  }
}
