import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';
import { EmailUserDto } from 'src/users/dto/email-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const currentUser: UserDocument = user.toObject();
      delete currentUser.password;
      return currentUser;
    }
    return null;
  }

  async login(user: UserDocument) {
    const payload = { username: user.email.toLowerCase(), sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async confirmEmail(email: EmailUserDto): Promise<string> {
    const emailCode = Math.floor(1000 + Math.random() * 9000).toString();
    const code2 = Math.floor(1000 + Math.random() * 9000).toString();

    await this.cacheManager.set(
      this.confirmationEmailCacheKey(email.email),
      JSON.stringify([emailCode, code2]),
      1000 * 180,
    );

    await this.mailService.sendUserConfirmation(email, emailCode);

    return code2;
  }

  async confirmRecoverEmail(email: EmailUserDto): Promise<string> {
    const emailCode = Math.floor(1000 + Math.random() * 9000).toString();
    const code2 = Math.floor(1000 + Math.random() * 9000).toString();

    await this.cacheManager.set(
      this.confirmationEmailCacheKey(email.email),
      JSON.stringify([emailCode, code2]),
      1000 * 180,
    );

    await this.mailService.sendUserRecoverConfirmation(email, emailCode);

    return code2;
  }

  async validateCodes(
    email: string,
    emailCode: string,
    code2: string,
  ): Promise<boolean> {
    const values: string = await this.cacheManager.get(
      this.confirmationEmailCacheKey(email),
    );

    return (
      values &&
      JSON.parse(values)?.length &&
      JSON.parse(values)[0] === emailCode &&
      JSON.parse(values)[1] === code2
    );
  }

  async deleteCodes(email: string): Promise<void> {
    this.cacheManager.del(this.confirmationEmailCacheKey(email));
  }

  private confirmationEmailCacheKey(email: string): string {
    return `confirmation-${email}`;
  }
}
