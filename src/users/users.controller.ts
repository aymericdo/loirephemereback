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
import { UsersService, USER_ORESTO } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDocument } from 'src/users/schemas/user.schema';
import { LocalAuthGuard } from 'src/auth/local-auth.guard';
import { AuthService } from 'src/auth/auth.service';
import {
  DEMO_RESTO,
  RestaurantsService,
} from 'src/restaurants/restaurants.service';
import { EmailUserDto } from 'src/users/dto/email-user.dto';
import { RecoverUserDto } from 'src/users/dto/recover-user.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { UserEntity } from 'src/users/serializers/user.serializer';
import { CaptchaGuard } from 'src/shared/guards/captcha.guard';
import { AuthorizationGuard } from 'src/shared/guards/authorization.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ChangePasswordUserDto } from 'src/users/dto/change-password-user.dto';

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
      throw new NotFoundException({
        message: 'email not found',
      });
    }

    return await this.authService.confirmEmail(body);
  }

  @Throttle(60, 10)
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

  @Throttle(60, 10)
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
    await this.usersService.updatePassword(user._id, body.password);

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

  @UseGuards(AuthorizationGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/all')
  async getAll(@Param('code') code: string): Promise<UserEntity[]> {
    const users = await this.restaurantsService.findUsersByCode(code);
    const restaurant = await this.restaurantsService.findByCode(code);
    return users.map((user) => new UserEntity(user.toObject(), restaurant._id));
  }

  @Throttle(60, 5)
  @UseGuards(AuthorizationGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code')
  async postUserToRestaurant(
    @Param('code') code: string,
    @Body('email') email: string,
  ): Promise<UserEntity> {
    const user: UserDocument = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException({
        message: 'user not found',
      });
    }

    if (await this.restaurantsService.isUserInRestaurant(code, user._id)) {
      throw new ForbiddenException({
        message: 'user already in restaurant',
      });
    }

    const restaurant = await this.restaurantsService.addUserToRestaurant(
      code,
      user,
    );

    return new UserEntity(user.toObject(), restaurant._id);
  }

  @UseGuards(AuthorizationGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code/delete')
  async deleteUserFromRestaurant(
    @Param('code') code: string,
    @Body('id') _id: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    const user = await this.usersService.findOne(_id);

    if (user.email === USER_ORESTO && code === DEMO_RESTO) {
      throw new ForbiddenException({
        message: 'user not deletable',
      });
    }

    if (authUser._id === _id) {
      throw new ForbiddenException({
        message: 'you cannot delete yourself',
      });
    }

    await this.restaurantsService.deleteUserToRestaurant(code, user);
    return true;
  }

  @UseGuards(AuthorizationGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Patch('by-code/:code')
  async patchRestaurantUser(
    @Param('code') code: string,
    @Body() updateUserDto: UpdateUserDto,
    @AuthUser() authUser: UserDocument,
  ): Promise<UserEntity> {
    if (authUser._id === updateUserDto._id) {
      throw new ForbiddenException({
        message: 'you cannot delete yourself from *users section*',
      });
    }

    const restaurantId = await this.restaurantsService.findIdByCode(code);

    const user = await this.usersService.updateAccess(
      updateUserDto._id,
      updateUserDto.access,
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

    await this.usersService.updatePassword(authUser._id, password);
    return true;
  }
}
