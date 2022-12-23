import { forwardRef, Module } from '@nestjs/common';
import { LocalStrategy } from 'src/auth/local.strategy';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { jwtConstants } from 'src/auth/constants';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { WsJwtAuthStrategy } from 'src/auth/ws-jwt-auth.strategy';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '2 days' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, WsJwtAuthStrategy],
  exports: [AuthService],
})
export class AuthModule {}
