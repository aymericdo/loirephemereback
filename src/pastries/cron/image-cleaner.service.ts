import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IMAGE_URL_PATH } from 'src/pastries/pastries.controller';
import * as fs from 'fs';
import { PastriesService } from 'src/pastries/pastries.service';

@Injectable()
export class ImageCleanerService {
  private readonly logger = new Logger(ImageCleanerService.name);

  constructor(private readonly pastriesService: PastriesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log(`Running...`);
    const folders = [];
    const rootThings = await fs.promises.readdir(IMAGE_URL_PATH);
    for (let i = 0; i < rootThings.length; ++i) {
      const thing = rootThings[i];
      if (
        (await fs.promises.stat(`${IMAGE_URL_PATH}/${thing}`)).isDirectory()
      ) {
        folders.push(thing);
      }
    }
    folders.forEach(async (code) => {
      const pastries = await fs.promises.readdir(`${IMAGE_URL_PATH}/${code}`);
      pastries.forEach(async (pastry) => {
        const isValid = await this.pastriesService.isImageUrlExists(
          code,
          `${code}/${pastry}`,
        );

        if (!isValid) {
          await fs.promises.unlink(`${IMAGE_URL_PATH}/${code}/${pastry}`);
        }
      });
    });
  }
}
