import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { Command, CommandDocument } from './schemas/command.schema';
import { randomBytes } from 'crypto';

@Injectable()
export class CommandsService {
  constructor(
    @InjectModel(Command.name) private commandModel: Model<CommandDocument>,
  ) {}

  async create(createCommandDto: CreateCommandDto): Promise<Command> {
    const reference = randomBytes(24).toString('hex').toUpperCase();
    const createdCommand = new this.commandModel({
      ...createCommandDto,
      reference: reference.slice(0, 4),
    });
    return (await createdCommand.save()).populate('pastries').execPopulate();
  }

  async update(updateCommandDto: UpdateCommandDto): Promise<Command> {
    const updatedCommand = new this.commandModel(updateCommandDto);
    return (await updatedCommand.save()).populate('pastries').execPopulate();
  }

  async closeCommand(id: string): Promise<Command> {
    return this.commandModel
      .findByIdAndUpdate(
        id,
        { isDone: true },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .exec();
  }

  async payedCommand(id: string): Promise<Command> {
    return this.commandModel
      .findByIdAndUpdate(
        id,
        { isPayed: true },
        { new: true, useFindAndModify: false },
      )
      .populate('pastries')
      .exec();
  }

  async findAll(): Promise<Command[]> {
    return this.commandModel
      .find()
      .sort({ createdAt: 1 })
      .populate('pastries')
      .exec();
  }
}
