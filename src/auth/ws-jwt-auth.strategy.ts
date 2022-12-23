import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from './constants';
import { UsersService } from 'src/users/users.service';
import { JwtPayload } from 'src/auth/jwt.strategy';

@Injectable()
export class WsJwtAuthStrategy extends PassportStrategy(Strategy, 'wsjwt') {
  constructor(private usersService: UsersService) {
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
