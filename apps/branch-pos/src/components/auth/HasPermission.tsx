import type { ReactNode } from 'react';
import usePermissions from '../../hooks/usePermissions';
import type { Permission } from '@goldensoft/core-schemas';

interface HasPermissionProps {
  permission: Permission | string | (Permission | string)[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function HasPermission({
  permission,
  requireAll = false,
  fallback = null,
  children,
}: HasPermissionProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let isAllowed = false;

  if (Array.isArray(permission)) {
    isAllowed = requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
  } else {
    isAllowed = hasPermission(permission);
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
