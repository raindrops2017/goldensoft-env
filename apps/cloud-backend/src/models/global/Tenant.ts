import mongoose, { Schema, Document } from 'mongoose';
import { getGlobalDb } from '../../db/connectionManager';

export interface ITenant extends Document {
  subdomain: string;
  status: 'active' | 'suspended';
  tenantDbName: string;
}

const TenantSchema = new Schema<ITenant>(
  {
    subdomain: { type: String, required: true, unique: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    tenantDbName: { type: String, required: true },
  },
  { timestamps: true }
);

let TenantModel: mongoose.Model<ITenant>;

export const getTenantModel = (): mongoose.Model<ITenant> => {
  if (!TenantModel) {
    TenantModel = getGlobalDb().model<ITenant>('Tenant', TenantSchema);
  }
  return TenantModel;
};
