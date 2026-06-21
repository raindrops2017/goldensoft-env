import mongoose from 'mongoose';
import { ITenant } from '../../models/global/Tenant';

declare global {
  namespace Express {
    interface Request {
      tenantDb: mongoose.Connection;
      tenantConfig: ITenant;
    }
  }
}
