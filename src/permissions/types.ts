/**
 * Permission Types
 */

/**
 * Permission code string type
 */
export type PermissionCode = string;

/**
 * Permission module types
 */
export type PermissionModule = string;

/**
 * Permission check options
 */
export interface PermissionCheckOptions {
  /**
   * Operator for multiple permissions check
   * @default 'OR'
   */
  operator?: 'AND' | 'OR';

  /**
   * Enable wildcard pattern matching
   * @default false
   */
  wildcard?: boolean;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  hasPermission: boolean;
  matchedPermissions: PermissionCode[];
  missingPermissions: PermissionCode[];
}

/**
 * Field permission result
 */
export interface FieldPermissionResult {
  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}
