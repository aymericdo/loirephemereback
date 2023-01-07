import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
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
}
