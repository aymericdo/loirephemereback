import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from 'src/auth/jwt.strategy';
import { SharedUsersService } from 'src/shared/services/shared-users.service';
import { jwtConstants } from './constants';

@Injectable()
export class WsJwtAuthStrategy extends PassportStrategy(Strategy, 'wsjwt') {
  constructor(private readonly sharedUsersService: SharedUsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromUrlQueryParameter('bearerToken'),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.sharedUsersService.findOne(payload.sub);
    return { userId: payload.sub, username: payload.username, authUser: user };
  }
}
