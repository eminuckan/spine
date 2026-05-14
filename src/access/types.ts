import type { PermissionCode } from '../permissions/types';

export type AccessOperator = 'AND' | 'OR';

export interface SubscriptionAccessSnapshot {
  exists?: boolean;
  status?: string | null;
  planCode?: string | null;
  featureKeys?: readonly string[] | null;
  limits?: Record<string, unknown> | null;
}

export interface AccessSubject {
  permissions?: readonly PermissionCode[] | null;
  subscription?: SubscriptionAccessSnapshot | null;
  isInternalUser?: boolean;
}

export interface AccessRequirement {
  permissions?: readonly PermissionCode[];
  permissionOperator?: AccessOperator;
  features?: readonly string[];
  featureOperator?: AccessOperator;
  requireActiveSubscription?: boolean;
  internalOnly?: boolean;
}

export type AccessDeniedReason =
  | 'internal-only'
  | 'inactive-subscription'
  | 'missing-permissions'
  | 'missing-features';

export interface AccessDecision {
  allowed: boolean;
  reasons: AccessDeniedReason[];
  missingPermissions: PermissionCode[];
  missingFeatures: string[];
}
