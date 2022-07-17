import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Pastry } from 'src/pastries/schemas/pastry.schema';

export type CommandDocument = Command & Document;

@Schema({ timestamps: true })
export class Command {
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Pastry' }] })
  pastries: Pastry[];

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  reference: string;

  @Prop({ type: Boolean, required: true, default: false })
  isDone: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isPayed: boolean;

  @Prop({ type: Number, required: true })
  totalPrice: number;
}

export const CommandSchema = SchemaFactory.createForClass(Command);
