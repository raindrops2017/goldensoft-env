import { db } from './index';
import { permissions, rolePermissions, roles } from './schema';
import { permissionsList } from '@goldensoft/core-schemas';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export function ensurePermissionsExist() {
  try {
    console.log('🔍 Checking for missing permissions...');
    
    // Get existing permissions from DB
    const existingPerms = db.select({ name: permissions.name }).from(permissions).all();
    const existingNames = new Set(existingPerms.map(p => p.name));

    // Get Admin and Manager roles
    const adminRole = db.select().from(roles).where(eq(roles.name, 'admin')).get() as any;
    const managerRole = db.select().from(roles).where(eq(roles.name, 'manager')).get() as any;

    for (const p of permissionsList) {
      if (!existingNames.has(p.name)) {
        console.log(`✨ Adding missing permission: ${p.name}`);
        const permId = crypto.randomUUID();
        
        db.insert(permissions).values({
          id: permId,
          name: p.name,
          description: p.description
        }).run();

        // Map to admin role
        if (adminRole) {
          db.insert(rolePermissions).values({
            roleId: adminRole.id,
            permissionId: permId
          }).run();
        }

        // Map to manager role (except for users:* permissions)
        if (managerRole && !p.name.startsWith('users:')) {
          db.insert(rolePermissions).values({
            roleId: managerRole.id,
            permissionId: permId
          }).run();
        }
      }
    }
    console.log('✅ Permissions check complete.');
  } catch (error) {
    console.error('❌ Error ensuring permissions exist:', error);
  }
}
