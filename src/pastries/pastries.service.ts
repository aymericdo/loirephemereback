import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pastry, PastryDocument } from './schemas/pastry.schema';
import { Pastry as PastryInterface } from './schemas/pastry.interface';

@Injectable()
export class PastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
  ) {}

  async findOne(pastryId: string): Promise<Pastry> {
    return this.pastryModel.findOne({ _id: pastryId }).lean();
  }

  async findAll(): Promise<Pastry[]> {
    return this.pastryModel.find().lean().exec();
  }

  async decrementStock(
    pastry: PastryInterface,
    count: number,
  ): Promise<Pastry> {
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
