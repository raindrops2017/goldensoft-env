import { useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { Permission } from '@goldensoft/core-schemas';

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);

  const hasPermission = useCallback(
    (permission: Permission | string): boolean => {
      if (!user) return false;
      // Assuming 'admin' role bypasses all checks or you can implement custom logic here
      // if (user.role === 'admin') return true;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: (Permission | string)[]): boolean => {
      if (!user) return false;
      return permissions.some((permission) => user.permissions.includes(permission));
    },
    [user]
  );

  const hasAllPermissions = useCallback(
    (permissions: (Permission | string)[]): boolean => {
      if (!user) return false;
      return permissions.every((permission) => user.permissions.includes(permission));
    },
    [user]
  );

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

export default usePermissions;
