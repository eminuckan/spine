import { PermissionChecker } from '../permissions/permission-service';
import type {
  AccessDecision,
  AccessDeniedReason,
  AccessOperator,
  AccessRequirement,
  AccessSubject,
  EntitlementAccessSnapshot,
} from './types';

const ACTIVE_ENTITLEMENT_STATUSES = new Set(['active', 'trialing']);

const EMPTY_DECISION: AccessDecision = Object.freeze({
  allowed: true,
  reasons: [],
  missingPermissions: [],
  missingFeatures: [],
});

function normalizeFeature(value: string): string {
  return value.trim().toLowerCase();
}

function hasActiveEntitlement(entitlement?: EntitlementAccessSnapshot | null): boolean {
  if (!entitlement?.exists) {
    return false;
  }

  return ACTIVE_ENTITLEMENT_STATUSES.has(entitlement.status?.toLowerCase() ?? '');
}

function checkFeatureSet(
  grantedFeatures: readonly string[],
  requiredFeatures: readonly string[],
  operator: AccessOperator,
): string[] {
  if (requiredFeatures.length === 0) {
    return [];
  }

  const granted = new Set(grantedFeatures.map(normalizeFeature));
  const normalizedRequired = requiredFeatures.map(normalizeFeature).filter(Boolean);

  if (operator === 'OR') {
    return normalizedRequired.some((feature) => granted.has(feature)) ? [] : normalizedRequired;
  }

  return normalizedRequired.filter((feature) => !granted.has(feature));
}

export function evaluateAccessRequirement(
  requirement: AccessRequirement | null | undefined,
  subject: AccessSubject,
): AccessDecision {
  if (!requirement) {
    return EMPTY_DECISION;
  }

  const reasons: AccessDeniedReason[] = [];
  const permissions = requirement.permissions ?? [];
  const features = requirement.features ?? [];
  const entitlement = subject.entitlement ?? subject.subscription;
  let missingPermissions: string[] = [];
  let missingFeatures: string[] = [];

  if (requirement.internalOnly && !subject.isInternalUser) {
    reasons.push('internal-only');
  }

  if (requirement.requireActiveEntitlement && !hasActiveEntitlement(entitlement)) {
    reasons.push('inactive-entitlement');
  } else if (requirement.requireActiveSubscription && !hasActiveEntitlement(entitlement)) {
    reasons.push('inactive-subscription');
  }

  if (permissions.length > 0) {
    const checker = new PermissionChecker([...(subject.permissions ?? [])]);
    const result = checker.hasPermissions([...permissions], {
      operator: requirement.permissionOperator ?? 'AND',
      wildcard: true,
    });

    if (!result.hasPermission) {
      missingPermissions = result.missingPermissions;
      reasons.push('missing-permissions');
    }
  }

  if (features.length > 0) {
    missingFeatures = checkFeatureSet(
      entitlement?.featureKeys ?? [],
      features,
      requirement.featureOperator ?? 'AND',
    );

    if (missingFeatures.length > 0) {
      reasons.push('missing-features');
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    missingPermissions,
    missingFeatures,
  };
}
