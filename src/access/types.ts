import type { PermissionCode } from '../permissions/types';

export type AccessOperator = 'AND' | 'OR';

export interface EntitlementAccessSnapshot {
  exists?: boolean;
  status?: string | null;
  planCode?: string | null;
  featureKeys?: readonly string[] | null;
  limits?: Record<string, unknown> | null;
}

/** @deprecated Use EntitlementAccessSnapshot instead. */
export type SubscriptionAccessSnapshot = EntitlementAccessSnapshot;

export interface AccessSubject {
  permissions?: readonly PermissionCode[] | null;
  entitlement?: EntitlementAccessSnapshot | null;
  /** @deprecated Use entitlement instead. */
  subscription?: SubscriptionAccessSnapshot | null;
  isInternalUser?: boolean;
}

export interface AccessRequirement {
  permissions?: readonly PermissionCode[];
  permissionOperator?: AccessOperator;
  features?: readonly string[];
  featureOperator?: AccessOperator;
  requireActiveEntitlement?: boolean;
  /** @deprecated Use requireActiveEntitlement instead. */
  requireActiveSubscription?: boolean;
  internalOnly?: boolean;
}

export type AccessDeniedReason =
  | 'internal-only'
  | 'inactive-entitlement'
  /** @deprecated Use inactive-entitlement instead. */
  | 'inactive-subscription'
  | 'missing-permissions'
  | 'missing-features';

export interface AccessDecision {
  allowed: boolean;
  reasons: AccessDeniedReason[];
  missingPermissions: PermissionCode[];
  missingFeatures: string[];
}
