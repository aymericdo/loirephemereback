import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
  ) {}

  async findOne(PastryDocumentId: string): Promise<PastryDocument> {
    return this.pastryModel
      .findOne({ _id: PastryDocumentId.toString() })
      .exec();
  }

  async findAll(): Promise<PastryDocument[]> {
    return this.pastryModel.find().sort({ displaySequence: 1 }).exec();
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
