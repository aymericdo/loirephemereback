import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { Command, CommandDocument } from './schemas/command.schema';

@Injectable()
export class CommandsService {
  constructor(
    @InjectModel(Command.name) private commandModel: Model<CommandDocument>,
  ) {}

  async create(createCommandDto: CreateCommandDto): Promise<Command> {
    const createdCommand = new this.commandModel(createCommandDto);
    return createdCommand.save();
  }

  async update(updateCommandDto: UpdateCommandDto): Promise<Command> {
    const updatedCommand = new this.commandModel(updateCommandDto);
    return updatedCommand.save();
  }

  async findAll(): Promise<Command[]> {
    return this.commandModel
      .find()
      .sort({ createdAt: -1 })
      .populate('pastries')
      .exec();
  }
}
