import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { SocketGateway } from 'src/notifications/gateways/web-socket.gateway';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';
import {
  Historical,
  Pastry,
  PastryDocument,
} from 'src/pastries/schemas/pastry.schema';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';

@Injectable()
export class PastriesService {
  private readonly lookupRestaurant = {
    $lookup: {
      from: 'restaurants',
      localField: 'restaurant',
      foreignField: '_id',
      as: 'restaurant',
    },
  }

  constructor(
    @InjectConnection() private connection: Connection,
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
        updatePastryDto.id,
        { $push: { historical: changes } },
        { new: true, useFindAndModify: false },
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
        updatePastryDto.id,
        {
          ...updatePastryDto,
          historical,
        },
        { new: true, useFindAndModify: false },
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
            commonStockPastry.id,
            { $set: { stock: updatePastryDto.stock } },
            { new: true, useFindAndModify: false },
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
          restaurant: restaurantId,
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
          restaurant: restaurantId,
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
      const session = await this.connection.startSession();
      
      try {
        session.startTransaction();

        const pastriesToMoveUpper: PastryDocument[] = await this.pastryModel
          .aggregate([
            { ...this.lookupRestaurant },
            {
              $match: {
                'restaurant.code': code,
                displaySequence: { $gte: newDisplaySequence },
              },
            },
            { $sort: { displaySequence: -1 } },
            { $addFields: { id: '$_id' } },
          ], { session })
          .exec();

        await this.pastryModel.bulkWrite([
          ...pastriesToMoveUpper.map((pastry) => {
            return {
              updateOne: {
                filter: { _id: pastry.id },
                update: {
                  $inc: { displaySequence: 1 },
                },
              },
            };
          }),
          {
            updateOne: {
              filter: { _id: updatePastryDto.id },
              update: {
                $set: { displaySequence: newDisplaySequence },
              },
            },
          },
        ], { session });

        const pastriesToMoveLower = await this.pastryModel
          .aggregate([
            { ...this.lookupRestaurant },
            {
              $match: {
                'restaurant.code': code,
                displaySequence: { $gt: oldDisplaySequence },
              },
            },
            { $sort: { displaySequence: 1 } },
            { $addFields: { id: '$_id' } },
          ], { session })
          .exec();

        await this.pastryModel.bulkWrite([
          ...pastriesToMoveLower.map((pastry) => {
            return {
              updateOne: {
                filter: { _id: pastry.id },
                update: {
                  $inc: { displaySequence: -1 },
                },
              },
            };
          }),
        ], { session });

        await session.commitTransaction();
      } catch {
        await session.abortTransaction();
      } finally {
        await session.endSession();
      }
    }

    return (
      (await this.pastryModel
        .aggregate([
          { ...this.lookupRestaurant },
          { $match: { 'restaurant.code': code } },
          { $sort: { displaySequence: 1 } },
          { $addFields: { id: '$_id' } },
          { $project: { displaySequence: 1, id: 1 } },
        ]).exec()
      ) as { id: string; displaySequence: number }[]
    ).reduce((prev, data) => {
      prev[data.id] = data.displaySequence;
      return prev;
    }, {} as { [id: string]: number });
  }

  async findDisplayableByCode(code: string): Promise<PastryDocument[]> {
    return await this.pastryModel
      .aggregate([
        {
          ...this.lookupRestaurant,
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
          ...this.lookupRestaurant,
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
          ...this.lookupRestaurant,
        },
        {
          $match: { 'restaurant.code': code },
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
      .deleteMany({ restaurant: restaurantId })
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
          ...this.lookupRestaurant,
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

  async incrementStock(pastryId: string, count: number): Promise<void> {
    const pastry: PastryDocument = await this.findOne(pastryId);

    if (pastry.commonStock) {
      const pastriesWithCommonStock = await this.findByCommonStock(
        pastry.commonStock,
      );

      pastriesWithCommonStock.forEach(async (pastry: PastryDocument) => {
        await this.incrementStockPastry(pastry, count);
      });
    } else {
      await this.incrementStockPastry(pastry, count);
    }
  }

  async verifyAllPastriesRestaurant(
    code: string,
    pastryIds: string[],
  ): Promise<boolean> {
    return (
      (
        (await this.pastryModel
          .aggregate([
            { ...this.lookupRestaurant },
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
            { ...this.lookupRestaurant },
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

  async sendStockNotification(pastry: PastryDocument): Promise<void> {
    const displayStock = await this.restaurantsService.isStockDisplayable(
      pastry.restaurant.code,
    );

    if (displayStock) {
      this.socketGateway.stockChanged(pastry.restaurant.code, {
        pastryId: pastry.id,
        newStock: pastry.stock,
      });
    }

    this.socketGateway.stockChangedAdmin(pastry.restaurant.code, {
      pastryId: pastry.id,
      newStock: pastry.stock,
    });
  }

  private async incrementStockPastry(
    pastry: PastryDocument,
    count: number,
  ): Promise<PastryDocument> {
    if (pastry.isInfiniteStock) return;

    let filter: {
      _id: string,
      stock?: Object,
    } = {
      _id: pastry.id,
    }

    if (count < 0) {
      // it's means decrement
      filter = {
        ...filter,
        stock: { $gte: count * -1 },
      }
    }

    const newPastry = await this.pastryModel
      .findOneAndUpdate(
        filter,
        { $inc: { stock: count } },
        { new: true, useFindAndModify: false },
      )
      .populate('restaurant')
      .exec();

    if (!newPastry) {
      throw {
        code: 'out_of_stock',
        pastry,
        error: new Error()
      };
    }

    await this.sendStockNotification(newPastry);

    return newPastry;
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

  private async getDefaultDisplaySequence(currentMaxDisplaySequence: number | null): Promise<number> {
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
            { ...this.lookupRestaurant },
            { $match: { 'restaurant.code': code } },
            { $sort: { displaySequence: -1 } },
            { $limit: 1 },
            { $project: { displaySequence: 1 } },
          ])
          .exec()) as { displaySequence?: number }[]
      )[0]?.displaySequence ?? null
    );
  }
}
