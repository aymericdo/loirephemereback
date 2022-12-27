import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { UsersService, USER_ORESTO } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from 'src/users/schemas/user.schema';
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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Throttle(60, 10)
  @Get('not-exists')
  async notExistsUserEmail(
    @Res() res: Response,
    @Query('email') email: string,
  ) {
    const isValid = await this.usersService.isEmailNotExists(email);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Throttle(60, 10)
  @Post('/confirm-email')
  async confirmUserWithEmail(@Res() res: Response, @Body() body: EmailUserDto) {
    const user = await this.usersService.findOneByEmail(body.email);

    if (user) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'email not valid' });
    }

    const code2 = await this.authService.confirmEmail(body);
    return res.status(HttpStatus.OK).json(code2);
  }

  @Throttle(60, 10)
  @Post('/confirm-recover-email')
  async confirmUserWithRecoverEmail(
    @Res() res: Response,
    @Body() body: EmailUserDto,
  ) {
    const user = await this.usersService.findOneByEmail(body.email);

    if (!user) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'email not valid' });
    }

    const code2 = await this.authService.confirmRecoverEmail(body);
    return res.status(HttpStatus.OK).json(code2);
  }

  @Throttle(60, 10)
  @Post('/change-password')
  async changePassword(@Res() res: Response, @Body() body: UpdateUserDto) {
    const user = await this.usersService.findOneByEmail(body.email);

    const isValid = await this.authService.validateCodes(
      body.email,
      body.emailCode,
      body.code2,
    );

    if (!user || !isValid) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'email not valid' });
    }

    await this.authService.deleteCodes(body.email);

    await this.usersService.update(body);

    return res.status(HttpStatus.OK).json(true);
  }

  @Throttle(60, 10)
  @Post('/validate-recover-email-code')
  async validateRecoverEmailCode(
    @Res() res: Response,
    @Body() body: RecoverUserDto,
  ) {
    const isValid = await this.authService.validateCodes(
      body.email,
      body.emailCode,
      body.code2,
    );

    if (!isValid) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'code not valid' });
    } else {
      return res.status(HttpStatus.OK).json(true);
    }
  }

  @Throttle(60, 5)
  @Post('/')
  async postUser(@Res() res: Response, @Body() body: CreateUserDto) {
    const isValid = await this.authService.validateCodes(
      body.email,
      body.emailCode,
      body.code2,
    );

    await this.authService.deleteCodes(body.email);

    if (!isValid) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'code not valid' });
    }
    const user = await this.usersService.create(body);
    return res.status(HttpStatus.OK).json(user);
  }

  @Throttle(60, 10)
  @UseGuards(JwtAuthGuard)
  @Get('exists')
  async existsUserEmail(@Res() res: Response, @Query('email') email: string) {
    const isValid = await this.usersService.isEmailExists(email);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Throttle(60, 10)
  @UseGuards(LocalAuthGuard)
  @Post('/auth/login')
  async login(@Req() req) {
    return await this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUser(@AuthUser() authUser: UserDocument): Promise<User> {
    return await this.usersService.findOne(authUser._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-code/:code/all')
  async getAll(
    @Res() res: Response,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const users = await this.restaurantsService.findUsersByCode(code);
    return res.status(HttpStatus.OK).json(users);
  }

  @Throttle(60, 5)
  @UseGuards(JwtAuthGuard)
  @Post('by-code/:code')
  async postUserToRestaurant(
    @Res() res: Response,
    @Param('code') code,
    @Body('email') email: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const user = await this.usersService.findOneByEmail(email);

    if (await this.restaurantsService.isUserInRestaurant(code, user._id)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user already in restaurant',
      });
    }

    await this.restaurantsService.addUserToRestaurant(code, user);
    return res.status(HttpStatus.OK).json(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-code/:code/delete')
  async deleteUserFromRestaurant(
    @Res() res: Response,
    @Param('code') code,
    @Body('email') email: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    if (authUser.email === USER_ORESTO && code === DEMO_RESTO) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not deletable',
      });
    }

    const usersCount = await this.restaurantsService.findUsersByCodeCount(code);

    if (usersCount === 1) {
      return res.status(HttpStatus.FORBIDDEN).json({
        message: 'no more users in the restaurant',
      });
    }

    const user = await this.usersService.findOneByEmail(email);
    await this.restaurantsService.deleteUserToRestaurant(code, user);
    return res.status(HttpStatus.OK).json(true);
  }
}
