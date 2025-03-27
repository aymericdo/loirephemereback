import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { Command } from 'src/commands/schemas/command.schema';
import { EmailUserDto } from 'src/users/dto/email-user.dto';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(email: EmailUserDto, code: string) {
    await this.mailerService.sendMail({
      to: email.email,
      from: `"Oresto" <${process.env.MAIL_FROM}>`, // override default from
      subject: 'Bienvenue ! 😊',
      template: './email-confirmation',
      context: {
        code,
      },
    });
  }

  async sendUserRecoverConfirmation(email: EmailUserDto, code: string) {
    await this.mailerService.sendMail({
      to: email.email,
      from: `"Oresto" <${process.env.MAIL_FROM}>`, // override default from
      subject: 'Mot de passe oublié ! 😓',
      template: './password-forgotten',
      context: {
        code,
      },
    });
  }

  async sendPaymentInformation(email: string, command: Command, receiptUrl: string) {
    await this.mailerService.sendMail({
      to: email,
      from: `"Oresto" <${process.env.MAIL_FROM}>`, // override default from
      subject: 'Paiement effectué ! 🎉',
      template: './payment-information',
      context: {
        reference: command.reference,
        price: command.discount ? command.discount.newPrice : command.totalPrice,
        receiptUrl,
      },
    });
  }
}
