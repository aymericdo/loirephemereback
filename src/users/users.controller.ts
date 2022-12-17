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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from 'src/users/schemas/user.schema';
import { LocalAuthGuard } from 'src/auth/local-auth.guard';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { EmailUserDto } from 'src/users/dto/email-user.dto';
import { RecoverUserDto } from 'src/users/dto/recover-user.dto';
import { UpdateUserDto } from 'src/users/dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Get('not-exists')
  async notExistsUserEmail(@Res() res, @Query() query) {
    const isValid = await this.usersService.isEmailNotExists(query.email);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Post('/confirm-email')
  async confirmUserWithEmail(@Res() res, @Body() body: EmailUserDto) {
    const user = await this.usersService.findOneByEmail(body.email);

    if (user) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'email not valid' });
    }

    const code2 = await this.authService.confirmEmail(body);
    return res.status(HttpStatus.OK).json(code2);
  }

  @Post('/confirm-recover-email')
  async confirmUserWithRecoverEmail(@Res() res, @Body() body: EmailUserDto) {
    const user = await this.usersService.findOneByEmail(body.email);

    if (!user) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'email not valid' });
    }

    const code2 = await this.authService.confirmRecoverEmail(body);
    return res.status(HttpStatus.OK).json(code2);
  }

  @Post('/change-password')
  async changePassword(@Res() res, @Body() body: UpdateUserDto) {
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

  @Post('/validate-recover-email-code')
  async validateRecoverEmailCode(@Res() res, @Body() body: RecoverUserDto) {
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

  @Post('/')
  async postUser(@Res() res, @Body() body: CreateUserDto) {
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

  @UseGuards(JwtAuthGuard)
  @Get('exists')
  async existsUserEmail(@Res() res, @Query() query) {
    const isValid = await this.usersService.isEmailExists(query.email);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @UseGuards(LocalAuthGuard)
  @Post('/auth/login')
  async login(@Req() req) {
    return await this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUser(@Req() req): Promise<User> {
    return await this.usersService.findOne(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-code/:code/all')
  async getAll(@Param('code') code: string): Promise<User[]> {
    return await this.restaurantsService.findUsersByCode(code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-code/:code')
  async postUserToRestaurant(
    @Res() res,
    @Param('code') code,
    @Body() body: { email: string },
  ) {
    const user = await this.usersService.findOneByEmail(body.email);
    await this.restaurantsService.addUserToRestaurant(code, user);
    return res.status(HttpStatus.OK).json(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('by-code/:code/delete')
  async deleteUserFromRestaurant(
    @Res() res,
    @Param('code') code,
    @Body() body: { email: string },
  ) {
    const user = await this.usersService.findOneByEmail(body.email);
    await this.restaurantsService.deleteUserToRestaurant(code, user);
    return res.status(HttpStatus.OK).json(true);
  }
}
