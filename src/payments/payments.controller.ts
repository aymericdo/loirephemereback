import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { CommandDocument } from 'src/commands/schemas/command.schema';
import { PaymentsService } from 'src/payments/payments.service';
import { Restaurant } from 'src/restaurants/schemas/restaurant.schema';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly sharedCommandsService: SharedCommandsService,
  ) { }

  @Post('create-checkout-session')
  async postCreateCheckoutSession(
    @Body('commandReference') commandReference: string,
  ) {
    const command: CommandDocument = await this.sharedCommandsService.findByReference(commandReference)
    if (!command) {
      throw new BadRequestException({
        message: "command reference not valid",
      });
    }
    const session = await this.paymentsService(command.restaurant).buildSession(command);
    
    await this.sharedCommandsService.addSessionId(command.id, session.id);
  
    return {
      clientSecret: session.client_secret,
    };
  }

  private paymentsService(restaurant: Restaurant): PaymentsService {
    return new PaymentsService(restaurant.paymentInformation.secretKey);
  }
}
