import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandsService } from 'src/commands/commands.service';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class PaymentRequiredCommandCleanerService {

  constructor(
    private readonly commandsService: CommandsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const commands = await this.commandsService.oldPaymentRequiredPendingCommands();

    commands.forEach(async (command) => {
      try {
        const sessionId: string = command.sessionId;

        if (!sessionId) throw new Error;

        const paymentsService = new PaymentsService(command.restaurant.paymentInformation.secretKey);
        const session = await paymentsService.getSession(sessionId);
        if (session.status === 'complete') {
          await this.commandsService.payByInternetCommand(command);
          await this.commandsService.sendPaymentSuccessEmail(paymentsService, session, command);
        } else {
          throw new Error;
        }
      } catch {
        await this.commandsService.cancelCommand(command.id, 'payment');
      }
    });
  }
}
