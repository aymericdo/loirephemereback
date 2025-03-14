import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { LocalAuthGuard } from 'src/auth/local-auth.guard';
import {
  DEMO_RESTO,
  RestaurantsService,
} from 'src/restaurants/restaurants.service';
import { Accesses } from 'src/shared/decorators/accesses.decorator';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { AuthorizationGuard } from 'src/shared/guards/authorization.guard';
import { CaptchaGuard } from 'src/shared/guards/captcha.guard';
import { ChangePasswordUserDto } from 'src/users/dto/change-password-user.dto';
import { EmailUserDto } from 'src/users/dto/email-user.dto';
import { RecoverUserDto } from 'src/users/dto/recover-user.dto';
import { UpdateAccessUserDto } from 'src/users/dto/update-user-access.dto';
import {
  Access,
  ACCESS_LIST,
  UserDocument,
} from 'src/users/schemas/user.schema';
import { UserEntity } from 'src/users/serializers/user.serializer';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { UpdateWaiterModeUserDto } from 'src/users/dto/update-user-waiter-mode.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('not-exists')
  async notExistsUserEmail(@Query('email') email: string): Promise<boolean> {
    return await this.usersService.isEmailNotExists(email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(CaptchaGuard)
  @Post('/confirm-email')
  async confirmUserWithEmail(@Body() body: EmailUserDto): Promise<string> {
    const user = await this.usersService.findOneByEmail(body.email);

    if (user) {
      throw new NotFoundException({
        message: 'user already created',
      });
    }

    return await this.authService.confirmEmail(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(CaptchaGuard)
  @Post('/confirm-recover-email')
  async confirmUserWithRecoverEmail(
    @Body() body: EmailUserDto,
  ): Promise<string> {
    const user = await this.usersService.findOneByEmail(body.email);

    if (!user) {
      throw new NotFoundException({
        message: 'email not found',
      });
    }

    return await this.authService.confirmRecoverEmail(body);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('/change-password')
  async changePassword(@Body() body: ChangePasswordUserDto): Promise<boolean> {
    const user = await this.usersService.findOneByEmail(body.email);

    const isValid = await this.authService.validateCodes(
      body.email,
      body.emailCode,
      body.code2,
    );

    if (!user || !isValid) {
      throw new BadRequestException({
        message: 'email not valid',
      });
    }

    await this.authService.deleteCodes(body.email);
    await this.usersService.updatePassword(
      user.id,
      body.password,
    );

    return true;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('/validate-recover-email-code')
  async validateRecoverEmailCode(
    @Body() body: RecoverUserDto,
  ): Promise<boolean> {
    const isValid = await this.authService.validateCodes(
      body.email,
      body.emailCode,
      body.code2,
    );

    if (!isValid) {
      throw new BadRequestException({
        message: 'code not valid',
      });
    } else {
      return true;
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('/')
  async postUser(@Body() body: CreateUserDto): Promise<UserEntity> {
    const isValid = await this.authService.validateCodes(
      body.email,
      body.emailCode,
      body.code2,
    );

    await this.authService.deleteCodes(body.email);

    if (!isValid) {
      throw new BadRequestException({
        message: 'code not valid',
      });
    }

    const newUser = await this.usersService.create(body);
    return new UserEntity(newUser.toObject());
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('exists')
  async existsUserEmail(@Query('email') email: string): Promise<boolean> {
    return await this.usersService.isEmailExists(email);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @Post('/auth/login')
  async login(@Req() req: { user: UserDocument }): Promise<{
    access_token: string;
  }> {
    return await this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get()
  async getUser(@AuthUser() authUser: UserDocument): Promise<UserEntity> {
    if (process.env.GOD_MODE.split('/').includes(authUser.email)) {
      return new UserEntity({
        ...authUser.toObject(),
        access: await this.restaurantsService.fullAccessForAllRestaurants(),
      });
    } else {
      return new UserEntity({
        ...authUser.toObject(),
        access: await this.restaurantsService.fullAccessForDemoResto(authUser),
      });
    }
  }

  @UseGuards(AuthorizationGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/count')
  async getCount(@Param('code') code: string): Promise<number> {
    return (await this.restaurantsService.findUsersByCode(code)).length;
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('users')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/all')
  async getAll(@Param('code') code: string): Promise<UserEntity[]> {
    const users = await this.restaurantsService.findUsersByCode(code);
    const restaurant = await this.restaurantsService.findByCode(code);
    return users.map(
      (user) => new UserEntity(user.toObject(), restaurant.id),
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthorizationGuard)
  @Accesses('users')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code')
  async postUserToRestaurant(
    @Param('code') code: string,
    @Body('email') email: string,
  ): Promise<UserEntity> {
    const currentUser: UserDocument = await this.usersService.findOneByEmail(
      email,
    );

    if (!currentUser) {
      throw new NotFoundException({
        message: 'user not found',
      });
    }

    if (
      await this.restaurantsService.isUserInRestaurant(
        code,
        currentUser.id,
      )
    ) {
      throw new ForbiddenException({
        message: 'user already in restaurant',
      });
    }

    const restaurant = await this.restaurantsService.addUserToRestaurant(
      code,
      currentUser,
    );

    const access: Access[] =
      restaurant.code === DEMO_RESTO ? [...ACCESS_LIST] : [];

    const user = await this.usersService.updateAccess(
      currentUser.id,
      access,
      restaurant.id,
    );

    return new UserEntity(user.toObject(), restaurant.id);
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('users')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code/delete')
  async deleteUserFromRestaurant(
    @Param('code') code: string,
    @Body('id') id: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(id);
    const restaurant = await this.restaurantsService.findByCode(code);

    if (authUser.id === id) {
      throw new ForbiddenException({
        message: 'you cannot delete yourself',
      });
    }

    await this.restaurantsService.deleteUserToRestaurant(code, user);
    await this.usersService.removeAccessFromRestaurant(
      user.id,
      restaurant.id,
    );
    return true;
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('users')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/access')
  async patchRestaurantUserAccess(
    @Param('code') code: string,
    @Body() updateUserDto: UpdateAccessUserDto,
    @AuthUser() authUser: UserDocument,
  ): Promise<UserEntity> {
    if (authUser.id === updateUserDto.id && !updateUserDto.access.includes('users')) {
      throw new ForbiddenException({
        message: 'you cannot delete yourself from *users section*',
      });
    }

    const restaurantId = await this.restaurantsService.findIdByCode(code);

    const user = await this.usersService.updateAccess(
      updateUserDto.id,
      updateUserDto.access,
      restaurantId,
    );
    return new UserEntity(user.toObject(), restaurantId);
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('users')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code/waiter-mode')
  async patchRestaurantUserWaiterMode(
    @Param('code') code: string,
    @Body() updateUserDto: UpdateWaiterModeUserDto,
  ): Promise<UserEntity> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    const user = await this.usersService.updateWaiterMode(
      updateUserDto.id,
      updateUserDto.waiterMode,
      restaurantId,
    );

    return new UserEntity(user.toObject(), restaurantId);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('change-old-password')
  async changeOldPassword(
    @Body('oldPassword') oldPassword: string,
    @Body('password') password: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    if (!(await this.authService.validateUser(authUser.email, oldPassword))) {
      throw new BadRequestException({
        message: 'old password not ok',
        code: 'old-password-not-ok',
      });
    }

    if (oldPassword === password) {
      throw new BadRequestException({
        message: 'new password need to be different',
      });
    }

    await this.usersService.updatePassword(authUser.id, password);
    return true;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('display-demo-resto')
  async patchDisplayDemoResto(
    @AuthUser() authUser: UserDocument,
    @Body('displayDemoResto') displayDemoResto: boolean,
  ): Promise<boolean> {
    await this.usersService.setDisplayDemoResto(
      authUser.id,
      displayDemoResto,
    );

    return displayDemoResto;
  }
}
