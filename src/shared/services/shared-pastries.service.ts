import { Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Pastry, PastryDocument } from 'src/pastries/schemas/pastry.schema';
import { SocketGateway } from 'src/shared/gateways/web-socket.gateway';

@Injectable()
export class SharedPastriesService {
  constructor(
    @InjectModel(Pastry.name) private pastryModel: Model<PastryDocument>,
    private readonly socketGateway: SocketGateway,
  ) {}

  async findOne(id: string): Promise<PastryDocument> {
    return await this.pastryModel
      .findOne({ _id: id })
      .populate('restaurant')
      .exec();
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

  async findByCommonStock(commonStock: string): Promise<PastryDocument[]> {
    return await this.pastryModel.find({ commonStock: commonStock }).exec();
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
}
