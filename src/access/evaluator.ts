import { PermissionChecker } from '../permissions/permission-service';
import type {
  AccessDecision,
  AccessDeniedReason,
  AccessOperator,
  AccessRequirement,
  AccessSubject,
  SubscriptionAccessSnapshot,
} from './types';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

const EMPTY_DECISION: AccessDecision = Object.freeze({
  allowed: true,
  reasons: [],
  missingPermissions: [],
  missingFeatures: [],
});

function normalizeFeature(value: string): string {
  return value.trim().toLowerCase();
}

function hasActiveSubscription(subscription?: SubscriptionAccessSnapshot | null): boolean {
  if (!subscription?.exists) {
    return false;
  }

  return ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status?.toLowerCase() ?? '');
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
  let missingPermissions: string[] = [];
  let missingFeatures: string[] = [];

  if (requirement.internalOnly && !subject.isInternalUser) {
    reasons.push('internal-only');
  }

  if (requirement.requireActiveSubscription && !hasActiveSubscription(subject.subscription)) {
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
      subject.subscription?.featureKeys ?? [],
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
