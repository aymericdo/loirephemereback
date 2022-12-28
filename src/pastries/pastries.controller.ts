import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
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
import { CommandsService } from 'src/commands/commands.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthUser } from 'src/shared/decorators/auth-user.decorator';
import { UserDocument } from 'src/users/schemas/user.schema';
import { WebPushGateway } from 'src/shared/gateways/web-push.gateway';
import { PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { UsersService } from 'src/users/users.service';

export const IMAGE_URL_PATH = './client/photos';

@Controller('pastries')
export class PastriesController {
  constructor(
    private readonly pastriesService: PastriesService,
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
    private readonly commandsService: CommandsService,
    private readonly webPushGateway: WebPushGateway,
  ) {}

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('by-code/:code')
  async getPastriesByCode(
    @Param('code') code: string,
  ): Promise<PastryEntity[]> {
    const pastries = await this.pastriesService.findDisplayableByCode(code);
    return pastries.map((p) => new PastryEntity(p));
  }

  @Post('notification')
  async postNotificationSub(
    @Body() body: { sub: PushSubscription; commandId: string },
  ): Promise<boolean> {
    this.webPushGateway.addClientWaitingQueueSubNotification(body);

    return true;
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Post('by-code/:code')
  async createPastry(
    @Body() body: CreatePastryDto,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<PastryEntity> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const restaurant: RestaurantDocument =
      await this.restaurantsService.findByCode(code);
    const pastry = await this.pastriesService.create(restaurant, body);

    return new PastryEntity(pastry.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Put('by-code/:code')
  async updatePastry(
    @Body() body: UpdatePastryDto,
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<{
    pastry: PastryEntity;
    displaySequenceById: { [id: string]: number };
  }> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    let displaySequenceById = {};
    const currentPastry = await this.pastriesService.findOne(
      body._id.toString(),
    );

    const isUpdatingStock: boolean = currentPastry.stock !== body.stock;

    if (
      currentPastry.name !== body.name &&
      (await this.commandsService.findByPastry(code, body._id.toString()))
        .length > 0
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
      isUpdatingStock,
    );

    return {
      pastry: new PastryEntity(pastry.toObject()),
      displaySequenceById,
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Put('by-code/:code/common-stock')
  async putCommonStock(
    @Param('code') code: string,
    @Body('pastries') pastries: PastryDocument[],
    @Body('commonStock') commonStock: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<PastryEntity[]> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    if (pastries.length === 1) {
      throw new BadRequestException({
        message: "can't associate only one pastry",
      });
    }

    await this.pastriesService.removeCommonStock(code, commonStock);
    await this.pastriesService.addCommonStock(code, pastries, commonStock);

    const newPastries = await this.pastriesService.findAllByCode(code);
    return newPastries.map((p) => new PastryEntity(p));
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/all')
  async getAll(
    @Param('code') code: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<PastryEntity[]> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const pastries = await this.pastriesService.findAllByCode(code);
    return pastries.map((p) => new PastryEntity(p));
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/not-exists')
  async validatePastryName(
    @Param('code') code: string,
    @Query('name') name: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    return await this.pastriesService.isNameNotExists(code, name);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    groups: ['admin'],
  })
  @Get('by-code/:code/pastries/:pastryId/isAlreadyOrdered')
  async isAlreadyOrdered(
    @Param('code') code: string,
    @Param('pastryId') pastryId: string,
    @AuthUser() authUser: UserDocument,
  ): Promise<boolean> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    return (await this.commandsService.findByPastry(code, pastryId)).length > 0;
  }

  @UseGuards(JwtAuthGuard)
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
  ): Promise<{
    originalname: string;
    filename: string;
  }> {
    if (!(await this.usersService.isAuthorized(authUser, code))) {
      throw new BadRequestException({
        message: 'user not in restaurant',
      });
    }

    const response = {
      originalname: file.originalname,
      filename: file.filename,
    };

    return response;
  }
}
