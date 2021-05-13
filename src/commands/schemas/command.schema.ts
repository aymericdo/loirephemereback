import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Pastry } from 'src/pastries/schemas/pastry.schema';

export type CommandDocument = Command & Document;

@Schema()
export class Command {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Pastry' }] })
  pastries: Pastry[];

  @Prop({ type: String, required: true })
  table: string;

  @Prop({ type: Date, required: true })
  dateTime: Date;
}

export const CommandSchema = SchemaFactory.createForClass(Command);
