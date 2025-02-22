import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  SerializeOptions,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PushSubscription } from 'web-push';
import { diskStorage } from 'multer';
import { PastriesService } from './pastries.service';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryEntity } from 'src/pastries/serializers/pastry.serializer';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';
import { WebPushGateway } from 'src/notifications/gateways/web-push.gateway';
import { AuthorizationGuard } from 'src/shared/guards/authorization.guard';
import { Accesses } from 'src/shared/decorators/accesses.decorator';
import { SharedCommandsService } from 'src/shared/services/shared-commands.service';
import sharp from 'sharp';

export const IMAGE_URL_PATH = './client/photos';

@Controller('pastries')
export class PastriesController {
  constructor(
    private readonly pastriesService: PastriesService,
    private readonly restaurantsService: RestaurantsService,
    private readonly sharedCommandsService: SharedCommandsService,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code')
  async getPastriesByCode(
    @Param('code') code: string,
  ): Promise<PastryEntity[]> {
    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);

    if (!restaurant) {
      throw new NotFoundException({
        message: 'resto not found',
      });
    }

    const pastries = await this.pastriesService.findDisplayableByCode(code);
    const displayStock = await this.restaurantsService.isStockDisplayable(code);

    return pastries.map((p) => new PastryEntity(p, displayStock));
  }

  @Post('notification')
  async postNotificationSub(
    @Body() body: { sub: PushSubscription },
    @Body('commandId') commandId: string,
  ): Promise<boolean> {
    this.webPushGateway.addClientWaitingQueueSubNotification(
      body.sub,
      commandId,
    );

    return true;
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code')
  async createPastry(
    @Body() body: CreatePastryDto,
    @Param('code') code: string,
  ): Promise<PastryEntity> {
    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);
    const pastry = await this.pastriesService.create(restaurant, body);

    return new PastryEntity(pastry.toObject(), restaurant.displayStock);
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Put('by-code/:code')
  async updatePastry(
    @Body() body: UpdatePastryDto,
    @Param('code') code: string,
  ): Promise<{
    pastry: PastryEntity;
    displaySequenceById: { [id: string]: number };
  }> {
    const displayStock = await this.restaurantsService.isStockDisplayable(code);
    const currentPastry = await this.pastriesService.findOne(body.id);

    if (currentPastry.restaurant.code !== code) {
      throw new BadRequestException({
        message: 'mismatch between pastry and restaurant',
      });
    }

    let displaySequenceById = {};

    const isUpdatingStock: boolean = currentPastry.stock !== body.stock;

    if (currentPastry.name !== body.name &&
      await this.sharedCommandsService.hasCommandsRelatedToPastry(code, body.id)
    ) {
      throw new BadRequestException({
        message: 'you cannot edit the name of a pastry already ordered',
      });
    }

    displaySequenceById = await this.pastriesService.movingPastries(
      code,
      body,
      currentPastry.displaySequence,
    );

    let historical = [];
    // Update historical
    if (currentPastry.isStatsAttributesChanged(body)) {
      historical = (
        await this.pastriesService.updateHistorical(
          { ...body, _id: body.id },
          currentPastry.getStatsAttributesChanged(body),
        )
      ).historical;
    }

    const pastry = await this.pastriesService.update(
      {
        ...body,
        _id: body.id,
        displaySequence: displaySequenceById[currentPastry.id],
      },
      historical,
      isUpdatingStock,
    );

    return {
      pastry: new PastryEntity(pastry.toObject(), displayStock),
      displaySequenceById,
    };
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Put('by-code/:code/common-stock')
  async putCommonStock(
    @Param('code') code: string,
    @Body('pastryIds') pastryIds: string[],
    @Body('commonStock') commonStock: string,
  ): Promise<PastryEntity[]> {
    if (pastryIds.length === 1) {
      throw new BadRequestException({
        message: "can't associate only one pastry",
      });
    }

    await this.pastriesService.deleteCommonStock(code, commonStock);
    await this.pastriesService.addCommonStock(code, pastryIds, commonStock);

    const displayStock = await this.restaurantsService.isStockDisplayable(code);

    const newPastries = await this.pastriesService.findAllByCode(code);
    return newPastries.map((p) => new PastryEntity(p, displayStock));
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu', 'stats')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/all')
  async getAll(@Param('code') code: string): Promise<PastryEntity[]> {
    const pastries = await this.pastriesService.findAllByCode(code);
    const displayStock = await this.restaurantsService.isStockDisplayable(code);

    return pastries.map((p) => new PastryEntity(p, displayStock));
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/not-exists')
  async validatePastryName(
    @Param('code') code: string,
    @Query('name') name: string,
    @Query('id') id: string,
  ): Promise<boolean> {
    return await this.pastriesService.isNameNotExists(code, name, id);
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/pastries/:pastryId/is-already-ordered')
  async isAlreadyOrdered(
    @Param('code') code: string,
    @Param('pastryId') pastryId: string,
  ): Promise<boolean> {
    return (
      await this.sharedCommandsService.hasCommandsRelatedToPastry(code, pastryId)
    );
  }

  @UseGuards(AuthorizationGuard)
  @Accesses('menu')
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
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
            .normalize('NFD')
            .replaceAll(/[\u0300-\u036f]/g, '')
            .replaceAll(/[^a-z0-9- ]/g, '')
            .replaceAll(' ', '-');
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
          new MaxFileSizeValidator({ maxSize: 10000000 }),
          new FileTypeValidator({ fileType: 'jpeg' }),
        ],
      }),
    )
    image: Express.Multer.File,
  ): Promise<{
    originalname: string;
    filename: string;
  }> {
    const buffer = await sharp(image.path)
      .rotate()
      .resize(1000)
      .jpeg({ quality: 80 })
      .withMetadata()
      .toBuffer();

    sharp(buffer).toFile(image.path);

    const response = {
      originalname: image.originalname,
      filename: image.filename,
    };

    return response;
  }
}
