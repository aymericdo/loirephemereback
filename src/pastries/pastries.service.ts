import { Injectable } from '@nestjs/common';

@Injectable()
export class PastriesService {
  getHello(): string {
    return 'Hello World!';
  }
}
