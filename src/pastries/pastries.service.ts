import { Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { RestaurantDocument } from 'src/restaurants/schemas/restaurant.schema';
import { CreatePastryDto } from 'src/pastries/dto/create-pastry.dto';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
  ) {}

  async findOne(pastryDocumentId: string): Promise<PastryDocument> {
    return await this.pastryModel
      .findOne({ _id: pastryDocumentId.toString() })
      .exec();
  }

  async create(
    restaurant: RestaurantDocument,
    createPastryDto: CreatePastryDto,
  ): Promise<PastryDocument> {
    const createdPastry = new this.pastryModel({
      ...createPastryDto,
      name: createPastryDto.name.trim(),
      description: createPastryDto.description.trim(),
      ingredients: createPastryDto.ingredients.map((i) => i.trim()),
      restaurant,
    });
    return await createdPastry.save();
  }

  async findDisplayable(): Promise<PastryDocument[]> {
    return await this.pastryModel
      .find({ hidden: { $ne: true } })
      .sort({ displaySequence: 1 })
      .exec();
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
        $sort: { displaySequence: 1 },
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
              $limit: 1,
            },
            {
              $match: {
                'restaurant.code': code,
                name: pastryName,
              },
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
}
