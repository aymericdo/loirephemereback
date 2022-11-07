import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
  ) {}

  async findOne(pastryDocumentId: string): Promise<PastryDocument> {
    return this.pastryModel
      .findOne({ _id: pastryDocumentId.toString() })
      .exec();
  }

  async findDisplayable(): Promise<PastryDocument[]> {
    return this.pastryModel
      .find({ hidden: { $ne: true } })
      .sort({ displaySequence: 1 })
      .exec();
  }

  async findDisplayableByCode(code: string): Promise<PastryDocument[]> {
    return this.pastryModel
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
    return this.pastryModel
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
          $sort: { displaySequence: 1 },
        },
      ])
      .exec();
  }

  async findByCommonStock(commonStock: string): Promise<PastryDocument[]> {
    return this.pastryModel.find({ commonStock: commonStock }).exec();
  }

  async decrementStock(
    pastry: PastryDocument,
    count: number,
  ): Promise<PastryDocument> {
    return this.pastryModel
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
