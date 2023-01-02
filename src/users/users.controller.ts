import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService, USER_ORESTO } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDocument } from 'src/users/schemas/user.schema';
import { LocalAuthGuard } from 'src/auth/local-auth.guard';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  DEMO_RESTO,
  RestaurantsService,
} from 'src/restaurants/restaurants.service';
import { EmailUserDto } from 'src/users/dto/email-user.dto';
import { RecoverUserDto } from 'src/users/dto/recover-user.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { UserEntity } from 'src/users/serializers/user.serializer';
import { CaptchaGuard } from 'src/shared/guards/catcha.guard';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Throttle(60, 10)
  @Get('not-exists')
  async notExistsUserEmail(@Query('email') email: string): Promise<boolean> {
    return await this.usersService.isEmailNotExists(email);
  }

  @Throttle(60, 10)
  @UseGuards(CaptchaGuard)
  @Post('/confirm-email')
  async confirmUserWithEmail(@Body() body: EmailUserDto): Promise<string> {
    const user = await this.usersService.findOneByEmail(body.email);

    if (user) {
      throw new BadRequestException({
        message: 'email not valid',
      });
    }

    return await this.authService.confirmEmail(body);
  }

  @Throttle(60, 10)
  @Post('/confirm-recover-email')
  async confirmUserWithRecoverEmail(
    @Body() body: EmailUserDto,
  ): Promise<string> {
    const user = await this.usersService.findOneByEmail(body.email);

    if (!user) {
      throw new BadRequestException({
        message: 'email not valid',
      });
    }

    return await this.authService.confirmRecoverEmail(body);
  }

  @Throttle(60, 10)
  @Post('/change-password')
  async changePassword(@Body() body: UpdateUserDto): Promise<boolean> {
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
    await this.usersService.update(body);

    return true;
  }

  @Throttle(60, 10)
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

  @Throttle(60, 5)
  @UseInterceptors(ClassSerializerInterceptor)
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

  @Throttle(60, 10)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('exists')
  async existsUserEmail(@Query('email') email: string): Promise<boolean> {
    return await this.usersService.isEmailExists(email);
  }

  @Throttle(60, 10)
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
    return new UserEntity(authUser.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/all')
  async getAll(
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<UserEntity[]> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const users = await this.restaurantsService.findUsersByCode(code);
    return users.map((user) => new UserEntity(user.toObject()));
  }

  @Throttle(60, 5)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code')
  async postUserToRestaurant(
    @Param('code') code,
    @Body('email') email: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<UserEntity> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const user = await this.usersService.findOneByEmail(email);

    if (await this.restaurantsService.isUserInRestaurant(code, user._id)) {
      throw new BadRequestException({
        message: 'user already in restaurant',
      });
    }

    await this.restaurantsService.addUserToRestaurant(code, user);
    return new UserEntity(user);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code/delete')
  async deleteUserFromRestaurant(
    @Param('code') code,
    @Body('email') email: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    if (authUser.email === USER_ORESTO && code === DEMO_RESTO) {
      throw new BadRequestException({
        message: 'user not deletable',
      });
    }

    const usersCount = await this.restaurantsService.findUsersByCodeCount(code);

    if (usersCount === 1) {
      throw new ForbiddenException({});
    }

    const user = await this.usersService.findOneByEmail(email);
    await this.restaurantsService.deleteUserToRestaurant(code, user);
    return true;
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

    await this.usersService.updatePassword(authUser._id, password);
    return true;
  }
}
