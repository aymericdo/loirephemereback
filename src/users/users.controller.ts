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

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly authService: AuthService,
  ) {}

  @Get('validate')
  async validateUserEmail(@Res() res, @Query() query) {
    const isValid = await this.usersService.isValidEmail(query.email);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Post('/')
  async postUser(@Res() res, @Body() body: CreateUserDto) {
    const user = await this.usersService.create(body);
    return res.status(HttpStatus.OK).json(user);
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
}
