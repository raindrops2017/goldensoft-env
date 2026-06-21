import mongoose from 'mongoose';
import { env } from '../env';

let globalDb: mongoose.Connection;
const tenantDbCache = new Map<string, mongoose.Connection>();

export const getGlobalDb = (): mongoose.Connection => {
  if (!globalDb) {
    globalDb = mongoose.createConnection(env.GLOBAL_MONGO_URI);
    
    globalDb.on('error', (err) => {
      console.error('Global DB connection error:', err);
    });
    
    globalDb.on('connected', () => {
      console.log('Connected to Global DB');
    });
  }
  return globalDb;
};

export const getTenantDb = (tenantDbName: string): mongoose.Connection => {
  if (tenantDbCache.has(tenantDbName)) {
    return tenantDbCache.get(tenantDbName)!;
  }

  // Swap the database name in the connection string
  // Assumes GLOBAL_MONGO_URI looks like mongodb://user:pass@host:port/global_db?options
  const uri = new URL(env.GLOBAL_MONGO_URI);
  uri.pathname = `/${tenantDbName}`;
  const tenantUri = uri.toString();

  const tenantDb = mongoose.createConnection(tenantUri);
  
  tenantDb.on('error', (err) => {
    console.error(`Tenant DB (${tenantDbName}) connection error:`, err);
  });

  tenantDbCache.set(tenantDbName, tenantDb);
  return tenantDb;
};
