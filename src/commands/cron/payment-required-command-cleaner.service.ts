import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommandsService } from 'src/commands/commands.service';
import { PaymentsService } from 'src/payments/payments.service';

@Injectable()
export class PaymentRequiredCommandCleanerService {
  private readonly logger = new Logger(PaymentRequiredCommandCleanerService.name);

  constructor(
    private readonly commandsService: CommandsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log(`Running...`);
    const commands = await this.commandsService.oldPaymentRequiredPendingCommands();

    commands.forEach(async (command) => {
      try {
        const sessionId: string = command.sessionId;

        if (!sessionId) throw new Error;

        const paymentsService = new PaymentsService(command.restaurant.paymentInformation.secretKey);
        const session = await paymentsService.getSession(sessionId);
        if (session.status === 'complete') {
          await this.commandsService.payByInternetCommand(command);
        } else {
          throw new Error;
        }
      } catch {
        await this.commandsService.cancelCommand(command.id, 'payment');
      }
    });

    this.logger.log(`Done`);
  }
}
