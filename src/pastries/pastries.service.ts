import { Connection, Model, ObjectId } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';
import { UpdatePastryDto } from 'src/pastries/dto/update-pastry.dto';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findOne(pastryDocumentId: string): Promise<PastryDocument> {
    return await this.pastryModel.findOne({ _id: pastryDocumentId }).exec();
  }

  async create(
    restaurant: RestaurantDocument,
    createPastryDto: CreatePastryDto,
  ): Promise<PastryDocument> {
    const displaySequence: number = await this.getDisplaySequence(
      restaurant.code,
      createPastryDto.displaySequence,
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

  async update(updatePastryDto: UpdatePastryDto): Promise<PastryDocument> {
    return await this.pastryModel.findOneAndUpdate(
      { _id: updatePastryDto._id.toString() },
      updatePastryDto,
      { new: true },
    );
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
    return await this.pastryModel.aggregate([
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
    ]);
  }

  async findByCommonStock(commonStock: string): Promise<PastryDocument[]> {
    return await this.pastryModel.find({ commonStock: commonStock }).exec();
  }

  async isValid(code: string, pastryName: string): Promise<boolean> {
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

  async decrementStock(
    pastry: PastryDocument,
    count: number,
  ): Promise<PastryDocument> {
    return await this.pastryModel
      .findByIdAndUpdate(
        pastry._id,
        {
          stock: pastry.stock - count,
        },
        { new: true, useFindAndModify: false },
      )
      .exec();
  }

  private async getDisplaySequence(
    code: string,
    displaySequence: number,
  ): Promise<number> {
    return displaySequence
      ? displaySequence
      : await this.getDefaultDisplaySequence(code);
  }

  private async getDefaultDisplaySequence(code: string): Promise<number> {
    return (await this.getCurrentMaxDisplaySequence(code)) + 1;
  }

  private async getCurrentMaxDisplaySequence(code: string): Promise<number> {
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
      )[0]?.displaySequence ?? 0
    );
  }
}
