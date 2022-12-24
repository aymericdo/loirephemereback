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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { PastriesService } from './pastries.service';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { PastryEntity } from 'src/pastries/serializers/pastries.serializer';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';
import { CommandsService } from 'src/commands/commands.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { UserDocument } from 'src/users/schemas/user.schema';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';

export const IMAGE_URL_PATH = './client/photos';

@Controller('pastries')
@SerializeOptions({
  strategy: 'excludeAll',
})
export class PastriesController {
  constructor(
    private readonly pastriesService: PastriesService,
    private readonly restaurantsService: RestaurantsService,
    private readonly commandsService: CommandsService,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code')
  async getPastriesByCode(@Res() res: Response, @Param('code') code: string) {
    return res.status(HttpStatus.UNAUTHORIZED).json('TEST');

    const pastries = await this.pastriesService.findDisplayableByCode(code);
    return res
      .status(HttpStatus.OK)
      .json(pastries.map((p) => new PastryEntity(p)));
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('by-code/:code')
  async createPastry(
    @Res() res: Response,
    @Body() body: CreatePastryDto,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);
    const pastry = await this.pastriesService.create(restaurant, body);
    return res.status(HttpStatus.OK).json(new PastryEntity(pastry.toObject()));
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Put('by-code/:code')
  async updatePastry(
    @Res() res: Response,
    @Body() body: UpdatePastryDto,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    let displaySequenceById = {};
    const currentPastry = await this.pastriesService.findOne(
      body._id.toString(),
    );

    if (
      currentPastry.name !== body.name &&
      (await this.commandsService.findByPastry(code, body._id.toString()))
        .length > 0
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
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
    if (this.pastriesService.isStatsAttributesChanged(currentPastry, body)) {
      historical = (
        await this.pastriesService.updateHistorical(
          { ...body },
          this.pastriesService.getStatsAttributesChanged(currentPastry, body),
        )
      ).historical;
    }

    const pastry = await this.pastriesService.update(
      {
        ...body,
        displaySequence: displaySequenceById[currentPastry._id],
      },
      historical,
    );

    return res.status(HttpStatus.OK).json({
      pastry: new PastryEntity(pastry.toObject()),
      displaySequenceById,
    });
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Put('by-code/:code/common-stock')
  async putCommonStock(
    @Res() res: Response,
    @Param('code') code: string,
    @Body('pastries') pastries: PastryDocument[],
    @Body('commonStock') commonStock: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    if (pastries.length === 1) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: "can't associate only one pastry",
      });
    }

    await this.pastriesService.removeCommonStock(code, commonStock);
    await this.pastriesService.addCommonStock(code, pastries, commonStock);

    const newPastries = await this.pastriesService.findAllByCode(code);
    return res
      .status(HttpStatus.OK)
      .json(newPastries.map((p) => new PastryEntity(p)));
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code/all')
  async getAll(
    @Res() res: Response,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const pastries = await this.pastriesService.findAllByCode(code);
    return res
      .status(HttpStatus.OK)
      .json(pastries.map((p) => new PastryEntity(p)));
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-code/:code/not-exists')
  async validatePastryName(
    @Res() res: Response,
    @Param('code') code: string,
    @Query('name') name: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const isValid = await this.pastriesService.isNameNotExists(code, name);

    return res.status(HttpStatus.OK).json(isValid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-code/:code/pastries/:pastryId/isAlreadyOrdered')
  async isAlreadyOrdered(
    @Res() res: Response,
    @Param('code') code: string,
    @Param('pastryId') pastryId: string,
    @AuthUser() authUser: UserDocument,
  ) {
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const isValid =
      (await this.commandsService.findByPastry(code, pastryId)).length > 0;

    return res.status(HttpStatus.OK).json(isValid);
  }

  @UseGuards(JwtAuthGuard)
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
    @Res() res: Response,
    @Param('code')
    code: string,
    @AuthUser()
    authUser: UserDocument,
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
    if (
      !(await this.restaurantsService.isUserInRestaurant(code, authUser._id))
    ) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'user not in restaurant',
      });
    }

    const response = {
      originalname: file.originalname,
      filename: file.filename,
    };

    return res.status(HttpStatus.OK).json(response);
  }

  @Post('notification')
  async postNotificationSub(
    @Res() res: Response,
    @Body() body: { sub: PushSubscription; commandId: string },
  ) {
    this.webPushGateway.addClientWaitingQueueSubNotification(body);

    return res.status(HttpStatus.OK).json();
  }
}
