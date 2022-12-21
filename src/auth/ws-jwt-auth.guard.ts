import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class WsJwtAuthGuard extends AuthGuard('wsjwt') {
  constructor() {
    super();
  }

  getRequest(context: ExecutionContext) {
    const token = context.switchToWs().getData();

    return {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
  }
}
