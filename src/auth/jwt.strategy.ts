import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SharedUsersService } from 'src/shared/services/shared-users.service';
import { jwtConstants } from './constants';

export interface JwtPayload {
  username: string;
  sub: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly sharedUsersService: SharedUsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.sharedUsersService.findOne(payload.sub);
    return { userId: payload.sub, username: payload.username, authUser: user };
  }
}
