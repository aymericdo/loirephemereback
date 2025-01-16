import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { PaymentsService } from 'src/payments/payments.service';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly sharedCommandsService: SharedCommandsService,
  ) { }

  @Post('create-checkout-session')
  async postCreateCheckoutSession(
    @Body('commandReference') commandReference: string,
    @Body('locale') locale: string,
  ) {
    const command: CommandDocument = await this.sharedCommandsService.findByReference(commandReference)
    if (!command) {
      throw new BadRequestException({
        message: "command reference not valid",
      });
    }
    const session = await this.paymentsService(command.restaurant).buildSession(command, locale);

    await this.cacheManager.set(
      PaymentsService.cacheKey(command.id),
      session.id,
      1000 * 60 * 15, // 15 minutes
    );
  
    return {
      clientSecret: session.client_secret,
    };
  }

  private paymentsService(restaurant: Restaurant): PaymentsService {
    return new PaymentsService(restaurant.paymentInformation.secretKey);
  }
}
