import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  items: string[];
  total: number;
  createdAt: Date;
  businessDate: string;
}

const OrderSchema = new Schema<IOrder>({
  items: [{ type: String }],
  total: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
  businessDate: { type: String, required: true }
});

export const getOrderModel = (tenantDb: mongoose.Connection): mongoose.Model<IOrder> => {
  if (tenantDb.models.Order) {
    return tenantDb.models.Order as mongoose.Model<IOrder>;
  }
  return tenantDb.model<IOrder>('Order', OrderSchema);
};
