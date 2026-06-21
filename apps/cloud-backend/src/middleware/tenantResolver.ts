import { Request, Response, NextFunction } from 'express';
import { getTenantModel } from '../models/global/Tenant';
import { getTenantDb } from '../db/connectionManager';

export const tenantResolver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const host = req.headers.host || '';
    const origin = req.headers.origin || '';
    
    let subdomain = '';
    
    // Check for custom header first to make testing easier
    if (req.headers['x-tenant-subdomain']) {
      subdomain = req.headers['x-tenant-subdomain'] as string;
    } else if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
      subdomain = host.split('.')[0];
    } else if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      try {
        const url = new URL(origin);
        subdomain = url.hostname.split('.')[0];
      } catch (e) {
        // invalid origin url
      }
    }

    if (!subdomain) {
      res.status(400).json({ 
        success: false, 
        error: 'Subdomain could not be determined. Please provide a valid Host, Origin, or x-tenant-subdomain header.' 
      });
      return;
    }

    const Tenant = getTenantModel();
    const tenant = await Tenant.findOne({ subdomain });

    if (!tenant) {
      res.status(404).json({ success: false, error: 'Tenant not found' });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({ success: false, error: 'Tenant is suspended' });
      return;
    }

    req.tenantConfig = tenant;
    req.tenantDb = getTenantDb(tenant.tenantDbName);

    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during tenant resolution' });
  }
};
