import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { EmailUserDto } from 'src/users/dto/email-user.dto';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserConfirmation(email: EmailUserDto, code: string) {
    await this.mailerService.sendMail({
      to: email.email,
      from: `"Loirephemere-Extended" <${process.env.MAIL_FROM}>`, // override default from
      subject: 'Bienvenue ! 😊 Confirmez votre email svp',
      template: './transactional',
      context: {
        code,
      },
    });
  }
}
