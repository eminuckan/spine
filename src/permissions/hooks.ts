/**
 * Permission Hooks
 * 
 * React hooks for permission checks.
 */

import { useMemo, useCallback } from 'react';
import { usePermissionStore, selectChecker } from './permission-store';
import type { PermissionCode, PermissionCheckOptions, PermissionModule } from './types';

/**
 * Hook for checking a single permission
 */
export function usePermission(permission: PermissionCode): boolean {
  const checker = usePermissionStore(selectChecker);
  return useMemo(() => checker.hasPermission(permission), [checker, permission]);
}

/**
 * Alias for usePermission
 */
export const useHasPermission = usePermission;

/**
 * Hook for checking multiple permissions
 */
export function usePermissions(
  permissions: PermissionCode[],
  options?: PermissionCheckOptions
) {
  const checker = usePermissionStore(selectChecker);
  return useMemo(
    () => checker.hasPermissions(permissions, options),
    [checker, permissions, options]
  );
}

/**
 * Alias for usePermissions
 */
export const useHasPermissions = usePermissions;

/**
 * Hook for checking module-level permissions
 */
export function useModulePermission(module: PermissionModule): boolean {
  const checker = usePermissionStore(selectChecker);
  return useMemo(() => checker.hasModulePermission(module), [checker, module]);
}

/**
 * Alias for useModulePermission
 */
export const useHasModulePermission = useModulePermission;

/**
 * Hook for getting a memoized permission checker function
 */
export function usePermissionChecker() {
  const checker = usePermissionStore(selectChecker);
  return useCallback(
    (permission: PermissionCode) => checker.hasPermission(permission),
    [checker]
  );
}

/**
 * Hook for getting all user permissions
 */
export function useAllPermissions(): readonly PermissionCode[] {
  const checker = usePermissionStore(selectChecker);
  return useMemo(() => checker.getAllPermissions(), [checker]);
}

/**
 * Hook for field-level permissions
 */
export function useFieldPermissions(module: PermissionModule, entity: string) {
  const checker = usePermissionStore(selectChecker);
  return useMemo(
    () => checker.getFieldPermissions(module, entity),
    [checker, module, entity]
  );
}

/**
 * Hook for permission loading state
 */
export function usePermissionLoading(): boolean {
  return usePermissionStore((state) => state.isLoading);
}
