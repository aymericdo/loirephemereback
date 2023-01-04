import { Connection, Model, ObjectId, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  Historical,
  Pastry,
  PastryDocument,
  statsAttributes,
} from 'src/pastries/schemas/pastry.schema';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';
import { RestaurantsService } from 'src/restaurants/restaurants.service';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly restaurantsService: RestaurantsService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findOne(id: string): Promise<PastryDocument> {
    return await this.pastryModel.findOne({ _id: id }).exec();
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
      ingredients: createPastryDto.ingredients.map((i) => i.trim()),
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
        updatePastryDto._id,
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
    if (isUpdatingStock && updatePastryDto.commonStock) {
      const commonStockPastries = await this.findByCommonStock(
        updatePastryDto.commonStock,
      );

      commonStockPastries.forEach(async (commonStockPastry: PastryDocument) => {
        const newCommonStockPastry = await this.pastryModel
          .findByIdAndUpdate(
            commonStockPastry._id,
            {
              $set: { stock: updatePastryDto.stock },
            },
            { new: true },
          )
          .populate('restaurant')
          .exec();

        this.socketGateway.stockChanged(newCommonStockPastry.restaurant.code, {
          pastryId: commonStockPastry._id,
          newStock: newCommonStockPastry.stock,
        });
      });
    }

    return await this.pastryModel
      .findByIdAndUpdate(
        updatePastryDto._id,
        {
          ...updatePastryDto,
          historical,
        },
        { new: true },
      )
      .exec();
  }

  async removeCommonStock(code: string, commonStock: string): Promise<void> {
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
    pastries: PastryDocument[],
    commonStock: string,
  ): Promise<void> {
    const restaurantId = await this.restaurantsService.findIdByCode(code);
    await this.pastryModel
      .updateMany(
        {
          restaurant: new Types.ObjectId(restaurantId),
          _id: { $in: pastries.map((p) => new Types.ObjectId(p._id)) },
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
      const transactionSession = await this.connection.startSession();
      try {
        transactionSession.startTransaction();

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

        transactionSession.commitTransaction();
      } catch (err) {
        console.error(err);
        transactionSession.abortTransaction();
      } finally {
        transactionSession.endSession();
      }
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
    }, {});
  }

  async findDisplayableByCode(code: string): Promise<Pastry[]> {
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

  async findAllByCode(code: string): Promise<Pastry[]> {
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

  async findByCommonStock(commonStock: string): Promise<PastryDocument[]> {
    return await this.pastryModel.find({ commonStock: commonStock }).exec();
  }

  async isNameNotExists(code: string, pastryName: string): Promise<boolean> {
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
          .exec()) as { totalCount: number }[]
      ).length === 0
    );
  }

  async decrementStock(pastry: PastryDocument, count: number): Promise<void> {
    if (pastry.commonStock) {
      const commonStockPastries = await this.findByCommonStock(
        pastry.commonStock,
      );

      commonStockPastries.forEach(async (commonStockPastry: PastryDocument) => {
        await this.decrementStockPastry(commonStockPastry, count);
      });
    } else {
      await this.decrementStockPastry(pastry, count);
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
      ).length === pastryIds.length
    );
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
      ).length !== 0
    );
  }

  isStatsAttributesChanged(
    oldPastry: PastryDocument,
    newPastry: UpdatePastryDto,
  ): boolean {
    return statsAttributes.some((attribute) => {
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

    statsAttributes.forEach((attribute) => {
      if (oldPastry[attribute] !== newPastry[attribute]) {
        historical[attribute] = [oldPastry[attribute], newPastry[attribute]];
      }
    });

    return historical;
  }

  private async decrementStockPastry(
    pastry: PastryDocument,
    count: number,
  ): Promise<PastryDocument> {
    const newPastry = await this.pastryModel
      .findByIdAndUpdate(
        pastry._id,
        { stock: pastry.stock - count },
        { new: true, useFindAndModify: false },
      )
      .populate('restaurant')
      .exec();

    this.socketGateway.stockChanged(newPastry.restaurant.code, {
      pastryId: newPastry._id,
      newStock: newPastry.stock,
    });

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
