import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  FileTypeValidator,
  Get,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Res,
  SerializeOptions,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { PastriesService } from './pastries.service';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { AppGateway } from 'src/app.gateway';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryEntity } from 'src/pastries/serializers/pastries.serializer';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';

const IMAGE_URL_PATH = './client/photos';

@Controller('pastries')
@SerializeOptions({
  strategy: 'excludeAll',
})
export class PastriesController {
  constructor(
    private readonly pastriesService: PastriesService,
    private readonly restaurantsService: RestaurantsService,
    private readonly appGateway: AppGateway,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('by-code/:code')
  async createPastry(
    @Body() body: CreatePastryDto,
    @Param('code') code: string,
  ): Promise<PastryEntity> {
    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);
    const pastry = await this.pastriesService.create(restaurant, body);
    return new PastryEntity(pastry.toObject());
  }

  @Put('by-code/:code')
  async updatePastry(
    @Body() body: UpdatePastryDto,
    @Param('code') code: string,
  ): Promise<{
    pastry: PastryEntity;
    displaySequenceById: { [pastryId: string]: number };
  }> {
    let displaySequenceById = {};
    const currentPastry = await this.pastriesService.findOne(
      body._id.toString(),
    );

    displaySequenceById = await this.pastriesService.movingPastries(
      code,
      body,
      currentPastry.displaySequence,
    );

    const pastry = await this.pastriesService.update({
      ...body,
      displaySequence: displaySequenceById[currentPastry._id],
    });

    return {
      pastry: new PastryEntity(pastry.toObject()),
      displaySequenceById,
    };
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code/all')
  async getAll(@Param('code') code: string): Promise<PastryEntity[]> {
    const pastries = await this.pastriesService.findAllByCode(code);
    return pastries.map((p) => new PastryEntity(p));
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code')
  async getPastriesByCode(
    @Param('code') code: string,
  ): Promise<PastryEntity[]> {
    const pastries = await this.pastriesService.findDisplayableByCode(code);
    return pastries.map((p) => new PastryEntity(p));
  }

  @Get('by-code/:code/validate')
  async validatePastryName(
    @Res() res,
    @Param('code') code: string,
    @Query() query: { name: string },
  ): Promise<PastryDocument[]> {
    const isValid = await this.pastriesService.isValid(code, query.name);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @Post('by-code/:code/upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: IMAGE_URL_PATH,
        filename: (req, file, callback) => {
          const folder = req.params.code;
          const name = file.originalname
            .split('.')[0]
            .toLowerCase()
            .replace(/[^a-z0-9- ]/g, '')
            .replace(' ', '-');
          const fileExtName = extname(file.originalname);

          const randomName: string = randomBytes(24)
            .toString('hex')
            .toLowerCase()
            .slice(0, 4);

          if (!fs.existsSync(`${IMAGE_URL_PATH}/${folder}`)) {
            fs.mkdirSync(`${IMAGE_URL_PATH}/${folder}`);
          }

          callback(null, `${folder}/${name}-${randomName}${fileExtName}`);
        },
      }),
    }),
  )
  async uploadedFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 3000000 }),
          new FileTypeValidator({ fileType: 'jpeg' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const response = {
      originalname: file.originalname,
      filename: file.filename,
    };
    return response;
  }

  @Post('notification')
  async postNotificationSub(
    @Res() res,
    @Body() body: { sub: any; commandId: string },
  ) {
    this.appGateway.addWaitingQueueSubNotification(body);

    res.status(HttpStatus.OK).json();
  }
}
