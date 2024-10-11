import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerRequest } from '@nestjs/throttler';

@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
  async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, generateKey } = requestProps;
    const client = context.switchToWs().getClient();
    const ip = client._socket.remoteAddress;
    const key = generateKey(context, ip, throttler.name);

    const { totalHits } = await this.storageService.increment(key, ttl, limit, blockDuration, throttler.name);

    if (totalHits > limit) {
      throw new ThrottlerException();
    }

    return true;
  }
}
