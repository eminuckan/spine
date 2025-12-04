/**
 * Permission Service
 * 
 * Core permission checking logic.
 */

import type {
  PermissionCode,
  PermissionModule,
  PermissionCheckOptions,
  PermissionCheckResult,
  FieldPermissionResult,
} from './types';

/**
 * Permission Checker Class
 * 
 * Provides methods for checking user permissions.
 */
export class PermissionChecker {
  private permissions: Set<PermissionCode>;
  private permissionArray: PermissionCode[];

  constructor(permissions: PermissionCode[]) {
    this.permissionArray = permissions;
    this.permissions = new Set(permissions);
  }

  /**
   * Check if user has a single permission
   */
  hasPermission(permission: PermissionCode): boolean {
    return this.permissions.has(permission);
  }

  /**
   * Check multiple permissions with AND/OR logic
   */
  hasPermissions(
    permissions: PermissionCode[],
    options: PermissionCheckOptions = {}
  ): PermissionCheckResult {
    const { operator = 'OR', wildcard = false } = options;

    const matchedPermissions: PermissionCode[] = [];
    const missingPermissions: PermissionCode[] = [];

    for (const permission of permissions) {
      const hasIt = wildcard
        ? this.hasWildcardPermission(permission)
        : this.hasPermission(permission);

      if (hasIt) {
        matchedPermissions.push(permission);
      } else {
        missingPermissions.push(permission);
      }
    }

    const hasPermission =
      operator === 'AND'
        ? missingPermissions.length === 0
        : matchedPermissions.length > 0;

    return {
      hasPermission,
      matchedPermissions,
      missingPermissions,
    };
  }

  /**
   * Check wildcard permission pattern
   */
  private hasWildcardPermission(pattern: PermissionCode): boolean {
    if (!pattern.includes('*')) {
      return this.hasPermission(pattern);
    }

    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
    );

    return this.permissionArray.some((p) => regex.test(p));
  }

  /**
   * Check if user has any permission in a module
   */
  hasModulePermission(module: PermissionModule): boolean {
    const prefix = `${module}.`;
    return this.permissionArray.some((p) => p.startsWith(prefix));
  }

  /**
   * Get field-level permissions for an entity
   */
  getFieldPermissions(
    module: PermissionModule,
    entity: string
  ): FieldPermissionResult {
    const base = `${module}.${entity}`;

    return {
      canView: this.hasPermission(`${base}.View`),
      canEdit: this.hasPermission(`${base}.Edit`),
      canCreate: this.hasPermission(`${base}.Create`),
      canDelete: this.hasPermission(`${base}.Delete`),
    };
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): readonly PermissionCode[] {
    return Object.freeze([...this.permissionArray]);
  }

  /**
   * Get permissions for a specific module
   */
  getModulePermissions(module: PermissionModule): PermissionCode[] {
    const prefix = `${module}.`;
    return this.permissionArray.filter((p) => p.startsWith(prefix));
  }

  /**
   * Check if user has any permissions
   */
  hasAnyPermissions(): boolean {
    return this.permissionArray.length > 0;
  }

  /**
   * Get permission count
   */
  getPermissionCount(): number {
    return this.permissionArray.length;
  }
}
