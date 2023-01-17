import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class WsJwtAuthStrategy extends PassportStrategy(Strategy, 'wsjwt') {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromUrlQueryParameter('bearerToken'),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    return { userId: payload.sub, username: payload.username, authUser: user };
  }
}
