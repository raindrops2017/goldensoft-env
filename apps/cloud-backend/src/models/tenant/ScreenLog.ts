import mongoose, { Schema, Document } from 'mongoose';

export interface IScreenLog extends Document {
  logId: string;
  userId: string;
  username: string;
  shiftId?: string | null;
  businessDate: string;
  actionType: string;
  tableId?: string | null;
  tableNo?: string | null;
  checkId?: string | null;
  permitterId?: string | null;
  permitterName?: string | null;
  details: Record<string, any>;
  createdAt: Date;
}

const ScreenLogSchema = new Schema<IScreenLog>({
  logId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  shiftId: { type: String },
  businessDate: { type: String, required: true },
  actionType: { type: String, required: true },
  tableId: { type: String },
  tableNo: { type: String },
  checkId: { type: String },
  permitterId: { type: String },
  permitterName: { type: String },
  details: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, required: true }
});

// Create indexes for auditing performance
ScreenLogSchema.index({ businessDate: 1 });
ScreenLogSchema.index({ userId: 1 });
ScreenLogSchema.index({ actionType: 1 });
ScreenLogSchema.index({ tableId: 1 });
ScreenLogSchema.index({ checkId: 1 });
ScreenLogSchema.index({ permitterId: 1 });
ScreenLogSchema.index({ createdAt: -1 });

export const getScreenLogModel = (tenantDb: mongoose.Connection): mongoose.Model<IScreenLog> => {
  if (tenantDb.models.ScreenLog) {
    return tenantDb.models.ScreenLog as mongoose.Model<IScreenLog>;
  }
  return tenantDb.model<IScreenLog>('ScreenLog', ScreenLogSchema);
};
