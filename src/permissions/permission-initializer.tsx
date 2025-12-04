/**
 * Permission Initializer Component
 * 
 * Initializes permission store from identity context.
 */

import { useEffect, type ReactNode } from 'react';
import { initializePermissions } from './permission-store';
import type { PermissionCode } from './types';

interface PermissionInitializerProps {
  permissions: PermissionCode[];
  isLoading?: boolean;
  children: ReactNode;
}

/**
 * Component that initializes permissions from props
 */
export function PermissionInitializer({
  permissions,
  isLoading = false,
  children,
}: PermissionInitializerProps) {
  useEffect(() => {
    initializePermissions(permissions, isLoading);
  }, [permissions, isLoading]);

  return <>{children}</>;
}
