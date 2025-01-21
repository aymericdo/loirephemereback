import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, ObjectId, QueryOptions, Types } from 'mongoose';
import { SocketGateway } from 'src/notifications/gateways/web-socket.gateway';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';
import {
  Historical,
  Pastry,
  PastryDocument,
  statsAttributes,
} from 'src/pastries/schemas/pastry.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
    private readonly restaurantsService: RestaurantsService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findOne(id: string): Promise<PastryDocument> {
    return await this.pastryModel
      .findById(id)
      .populate('restaurant')
      .exec();
  }

  async findOneWithSession(id: string, session: ClientSession): Promise<PastryDocument> {
    return await this.pastryModel
      .findById(id, null, { session })
      .populate('restaurant')
      .exec();
  }

  async create(
    restaurant: RestaurantDocument,
    createPastryDto: CreatePastryDto,
  ): Promise<PastryDocument> {
    const displaySequence: number = await this.getDisplaySequence(
      restaurant.code,
      null,
    );

    const createdPastry = new this.pastryModel({
      ...createPastryDto,
      name: createPastryDto.name.trim(),
      description: createPastryDto.description.trim(),
      ingredients: createPastryDto.ingredients?.map((i) => i.trim()),
      displaySequence,
      restaurant,
    });
    return await createdPastry.save();
  }

  async updateHistorical(
    updatePastryDto: UpdatePastryDto,
    changes: Historical,
  ): Promise<PastryDocument> {
    return await this.pastryModel
      .findByIdAndUpdate(
        updatePastryDto._id.toString(),
        { $push: { historical: changes } },
        { new: true },
      )
      .exec();
  }

  async update(
    updatePastryDto: UpdatePastryDto,
    historical: Historical[],
    isUpdatingStock = false,
  ): Promise<PastryDocument> {
    const pastry = await this.pastryModel
      .findByIdAndUpdate(
        updatePastryDto._id.toString(),
        {
          ...updatePastryDto,
          historical,
        },
        { new: true },
      )
      .populate('restaurant')
      .exec();

    if (isUpdatingStock && updatePastryDto.commonStock) {
      const commonStockPastries = await this.findByCommonStock(
        updatePastryDto.commonStock,
      );

      commonStockPastries.forEach(async (commonStockPastry: PastryDocument) => {
        const newCommonStockPastry = await this.pastryModel
          .findByIdAndUpdate(
            commonStockPastry._id.toString(),
            {
              $set: { stock: updatePastryDto.stock },
            },
            { new: true },
          )
          .populate('restaurant')
          .exec();

        await this.sendStockNotification(newCommonStockPastry);
      });
    } else if (isUpdatingStock) {
      await this.sendStockNotification(pastry);
    }

    return pastry;
  }

  async deleteCommonStock(code: string, commonStock: string): Promise<void> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    await this.pastryModel
      .updateMany(
        {
          restaurant: new Types.ObjectId(restaurantId),
          commonStock: commonStock,
        },
        {
          $unset: { commonStock: 1 },
        },
      )
      .exec();
  }

  async addCommonStock(
    code: string,
    pastryIds: string[],
    commonStock: string,
  ): Promise<void> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);
    await this.pastryModel
      .updateMany(
        {
          restaurant: new Types.ObjectId(restaurantId),
          _id: { $in: pastryIds.map((id) => new Types.ObjectId(id)) },
        },
        {
          $set: { commonStock: commonStock, stock: 0 },
        },
      )
      .exec();
  }

  async movingPastries(
    code: string,
    updatePastryDto: UpdatePastryDto,
    oldDisplaySequence: number,
  ): Promise<{ [pastryId: string]: number }> {
    let newDisplaySequence = updatePastryDto.displaySequence;

    if (newDisplaySequence > oldDisplaySequence) {
      newDisplaySequence += 1;
    }

    newDisplaySequence = await this.getDisplaySequence(
      code,
      newDisplaySequence,
    );

    if (newDisplaySequence !== oldDisplaySequence) {
      const pastryToMoveUpper = await this.pastryModel
        .aggregate([
          {
            $lookup: {
              from: 'restaurants',
              localField: 'restaurant',
              foreignField: '_id',
              as: 'restaurant',
            },
          },
          {
            $match: {
              'restaurant.code': code,
              displaySequence: { $gte: newDisplaySequence },
            },
          },
          {
            $sort: {
              displaySequence: -1,
            },
          },
        ])
        .exec();

      await this.pastryModel.bulkWrite([
        ...pastryToMoveUpper.map((pastry) => {
          return {
            updateOne: {
              filter: { _id: pastry._id },
              update: {
                $inc: { displaySequence: 1 },
              },
            },
          };
        }),
        {
          updateOne: {
            filter: { _id: updatePastryDto._id },
            update: {
              $set: { displaySequence: newDisplaySequence },
            },
          },
        },
      ]);

      const pastryToMoveLower = await this.pastryModel
        .aggregate([
          {
            $lookup: {
              from: 'restaurants',
              localField: 'restaurant',
              foreignField: '_id',
              as: 'restaurant',
            },
          },
          {
            $match: {
              'restaurant.code': code,
              displaySequence: { $gt: oldDisplaySequence },
            },
          },
          {
            $sort: {
              displaySequence: 1,
            },
          },
        ])
        .exec();

      await this.pastryModel.bulkWrite([
        ...pastryToMoveLower.map((pastry) => {
          return {
            updateOne: {
              filter: { _id: pastry._id },
              update: {
                $inc: { displaySequence: -1 },
              },
            },
          };
        }),
      ]);
    }

    return (
      (await this.pastryModel
        .aggregate([
          {
            $lookup: {
              from: 'restaurants',
              localField: 'restaurant',
              foreignField: '_id',
              as: 'restaurant',
            },
          },
          {
            $match: {
              'restaurant.code': code,
            },
          },
          {
            $sort: {
              displaySequence: 1,
            },
          },
          {
            $project: {
              displaySequence: 1,
            },
          },
        ])
        .exec()) as { _id: ObjectId; displaySequence: number }[]
    ).reduce((prev, data) => {
      prev[data._id.toString()] = data.displaySequence;
      return prev;
    }, {} as { [id: string]: number });
  }

  async findDisplayableByCode(code: string): Promise<PastryDocument[]> {
    return await this.pastryModel
      .aggregate([
        {
          $lookup: {
            from: 'restaurants',
            localField: 'restaurant',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        {
          $match: { 'restaurant.code': code, hidden: { $ne: true } },
        },
        {
          $sort: { displaySequence: 1 },
        },
      ])
      .exec();
  }

  async findAllByCode(code: string): Promise<PastryDocument[]> {
    return await this.pastryModel
      .aggregate([
        {
          $lookup: {
            from: 'restaurants',
            localField: 'restaurant',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        {
          $match: { 'restaurant.code': code },
        },
        {
          $sort: {
            displaySequence: 1,
          },
        },
      ])
      .exec();
  }

  async findRandomByCode(code: string, n: number): Promise<PastryDocument[]> {
    return await this.pastryModel
      .aggregate([
        {
          $lookup: {
            from: 'restaurants',
            localField: 'restaurant',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        {
          $match: {
            'restaurant.code': code,
          },
        },
        {
          $sample: {
            size: n,
          },
        },
      ])
      .exec();
  }

  async deleteAllByCode(code: string): Promise<void> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);

    await this.pastryModel
      .deleteMany({ restaurant: new Types.ObjectId(restaurantId) })
      .exec();
  }

  async findByCommonStock(commonStock: string): Promise<PastryDocument[]> {
    return await this.pastryModel.find({ commonStock }).exec();
  }

  async isNameNotExists(
    code: string,
    pastryName: string,
    pastryId?: string,
  ): Promise<boolean> {
    const totalCountList = (await this.pastryModel
      .aggregate([
        {
          $lookup: {
            from: 'restaurants',
            localField: 'restaurant',
            foreignField: '_id',
            as: 'restaurant',
          },
        },
        {
          $match: pastryId
            ? {
                'restaurant.code': code,
                name: pastryName,
                _id: { $ne: new Types.ObjectId(pastryId) },
              }
            : {
                'restaurant.code': code,
                name: pastryName,
              },
        },
        {
          $limit: 1,
        },
        {
          $count: 'totalCount',
        },
      ])
      .collation({ locale: 'fr', strength: 1 })
      .exec()) as { totalCount: number }[];

    return !totalCountList.length || totalCountList[0]?.totalCount === 0;
  }

  async decrementStock(pastry: PastryDocument, count: number, { session }: { session?: ClientSession } = {}): Promise<void> {
    if (pastry.commonStock) {
      const commonStockPastries = await this.findByCommonStock(
        pastry.commonStock,
      );

      commonStockPastries.forEach(async (commonStockPastry: PastryDocument) => {
        await this.decrementStockPastry(commonStockPastry, count, { session });
      });
    } else {
      await this.decrementStockPastry(pastry, count, { session },);
    }
  }

  async incrementStock(pastry: PastryDocument, count: number): Promise<void> {
    // increment is just decrement but with the negative count
    const newCount = count * -1;
    await this.decrementStock(pastry, newCount);
  }

  async verifyAllPastriesRestaurant(
    code: string,
    pastryIds: string[],
  ): Promise<boolean> {
    return (
      (
        (await this.pastryModel
          .aggregate([
            {
              $lookup: {
                from: 'restaurants',
                localField: 'restaurant',
                foreignField: '_id',
                as: 'restaurant',
              },
            },
            {
              $match: {
                'restaurant.code': code,
                _id: { $in: pastryIds.map((id) => new Types.ObjectId(id)) },
              },
            },
            {
              $count: 'totalCount',
            },
          ])
          .exec()) as { totalCount: number }[]
      )[0]?.totalCount === pastryIds.length
    );
  }

  async hiddenPastries(pastryIds: string[]): Promise<PastryDocument[]> {
    return await this.pastryModel.find({
      _id: { $in: pastryIds.map((id) => new Types.ObjectId(id)) },
      hidden: true,
    }).exec();
  }

  async isImageUrlExists(code: string, imageUrl: string): Promise<boolean> {
    return (
      (
        (await this.pastryModel
          .aggregate([
            {
              $lookup: {
                from: 'restaurants',
                localField: 'restaurant',
                foreignField: '_id',
                as: 'restaurant',
              },
            },
            {
              $match: {
                'restaurant.code': code,
                imageUrl: imageUrl,
              },
            },
            {
              $limit: 1,
            },
            {
              $count: 'totalCount',
            },
          ])
          .collation({ locale: 'fr', strength: 1 })
          .exec()) as { totalCount: number }[]
      )[0]?.totalCount !== 0
    );
  }

  isStatsAttributesChanged(
    oldPastry: PastryDocument,
    newPastry: UpdatePastryDto,
  ): boolean {
    return statsAttributes.some((attribute: string) => {
      return oldPastry[attribute] !== newPastry[attribute];
    });
  }

  getStatsAttributesChanged(
    oldPastry: PastryDocument,
    newPastry: UpdatePastryDto,
  ): Historical {
    const historical: Historical = {
      date: new Date(),
    };

    statsAttributes.forEach((attribute: string) => {
      if (oldPastry[attribute] !== newPastry[attribute]) {
        historical[attribute] = [oldPastry[attribute], newPastry[attribute]];
      }
    });

    return historical;
  }

  async sendStockNotification(pastry: PastryDocument): Promise<void> {
    const displayStock = await this.restaurantsService.isStockDisplayable(
      pastry.restaurant.code,
    );

    if (displayStock) {
      this.socketGateway.stockChanged(pastry.restaurant.code, {
        pastryId: pastry._id.toString(),
        newStock: pastry.stock,
      });
    }

    this.socketGateway.stockChangedAdmin(pastry.restaurant.code, {
      pastryId: pastry._id.toString(),
      newStock: pastry.stock,
    });
  }

  private async decrementStockPastry(
    pastry: PastryDocument,
    count: number,
    { session }: { session?: ClientSession } = {},
  ): Promise<PastryDocument> {
    if (await this.isInfiniteStock(pastry)) return;

    let requestOptions: QueryOptions = { new: true, useFindAndModify: false }

    if (session) {
      requestOptions = {
        ...requestOptions,
        session,
      }
    }

    const newPastry = await this.pastryModel
      .findOneAndUpdate(
        { _id: pastry._id.toString() },
        { stock: pastry.stock - count },
        requestOptions,
      )
      .populate('restaurant')
      .exec();

    if (!session) {
      await this.sendStockNotification(newPastry);
    }

    return newPastry;
  }

  private async isInfiniteStock(pastry: PastryDocument): Promise<boolean> {
    return pastry.stock === null;
  }

  private async getDisplaySequence(
    code: string,
    displaySequence: number,
  ): Promise<number> {
    const currentMaxDisplaySequence = await this.getCurrentMaxDisplaySequence(
      code,
    );

    return displaySequence !== null &&
      displaySequence <= currentMaxDisplaySequence + 1
      ? displaySequence
      : await this.getDefaultDisplaySequence(currentMaxDisplaySequence);
  }

  private async getDefaultDisplaySequence(
    currentMaxDisplaySequence: number | null,
  ): Promise<number> {
    return currentMaxDisplaySequence === null
      ? 0
      : currentMaxDisplaySequence + 1;
  }

  private async getCurrentMaxDisplaySequence(
    code: string,
  ): Promise<number | null> {
    return (
      (
        (await this.pastryModel
          .aggregate([
            {
              $lookup: {
                from: 'restaurants',
                localField: 'restaurant',
                foreignField: '_id',
                as: 'restaurant',
              },
            },
            {
              $match: {
                'restaurant.code': code,
              },
            },
            {
              $sort: {
                displaySequence: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                displaySequence: 1,
              },
            },
          ])
          .exec()) as { displaySequence?: number }[]
      )[0]?.displaySequence ?? null
    );
  }
}
