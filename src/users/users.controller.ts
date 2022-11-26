import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDocument } from 'src/users/schemas/user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('validate')
  async validateRestaurant(@Res() res, @Query() query) {
    const isValid = await this.usersService.isValidEmail(query.email);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Get('by-code/:code/all')
  async getAll(@Param('code') code: string): Promise<UserDocument[]> {
    const users = await this.usersService.findAllByCode(code);
    return users;
  }

  @Post('/')
  async postUser(@Res() res, @Body() body: CreateUserDto) {
    const user = await this.usersService.create(body);
    return res.status(HttpStatus.OK).json(user);
  }
}
