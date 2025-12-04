/**
 * Permission Components
 * 
 * Protected UI components that conditionally render based on permissions.
 */

import React, { type ReactNode, type ComponentProps } from 'react';
import { usePermission, usePermissions } from './hooks';
import type { PermissionCode, PermissionCheckOptions } from './types';

// ============================================================================
// ProtectedButton
// ============================================================================

interface ProtectedButtonProps extends ComponentProps<'button'> {
  permission: PermissionCode;
  fallback?: ReactNode;
}

/**
 * Button that only renders if user has the required permission
 */
export function ProtectedButton({
  permission,
  fallback = null,
  children,
  ...props
}: ProtectedButtonProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <button {...props}>{children}</button>;
}

// ============================================================================
// ProtectedLink
// ============================================================================

interface ProtectedLinkProps extends ComponentProps<'a'> {
  permission: PermissionCode;
  fallback?: ReactNode;
}

/**
 * Link that only renders if user has the required permission
 */
export function ProtectedLink({
  permission,
  fallback = null,
  children,
  ...props
}: ProtectedLinkProps) {
  const hasPermission = usePermission(permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <a {...props}>{children}</a>;
}

// ============================================================================
// ProtectedSection
// ============================================================================

interface ProtectedSectionProps {
  permission?: PermissionCode;
  permissions?: PermissionCode[];
  options?: PermissionCheckOptions;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Section that only renders if user has the required permission(s)
 */
export function ProtectedSection({
  permission,
  permissions,
  options,
  fallback = null,
  children,
}: ProtectedSectionProps) {
  // Single permission check
  const singlePermissionResult = usePermission(permission || '');
  
  // Multiple permissions check
  const multiplePermissionsResult = usePermissions(permissions || [], options);

  // Determine if we should render
  let hasPermission = false;
  
  if (permission) {
    hasPermission = singlePermissionResult;
  } else if (permissions && permissions.length > 0) {
    hasPermission = multiplePermissionsResult.hasPermission;
  } else {
    // No permission specified, render by default
    hasPermission = true;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// ProtectedAction
// ============================================================================

interface ProtectedActionProps {
  permission: PermissionCode;
  onAction: () => void;
  children: (props: { onClick: () => void; disabled: boolean }) => ReactNode;
}

/**
 * Render prop component for protected actions
 */
export function ProtectedAction({
  permission,
  onAction,
  children,
}: ProtectedActionProps) {
  const hasPermission = usePermission(permission);

  return (
    <>
      {children({
        onClick: hasPermission ? onAction : () => {},
        disabled: !hasPermission,
      })}
    </>
  );
}
