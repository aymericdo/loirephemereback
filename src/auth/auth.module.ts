import { Module } from '@nestjs/common';
import { LocalStrategy } from 'src/auth/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { jwtConstants } from 'src/auth/constants';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { WsJwtAuthStrategy } from 'src/auth/ws-jwt-auth.strategy';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MailModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '7 days' },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, WsJwtAuthStrategy],
  exports: [AuthService],
})
export class AuthModule {}
