import { describe, expect, it } from 'vitest';
import { evaluateAccessRequirement } from '../../src/access/evaluator';

describe('evaluateAccessRequirement', () => {
  it('allows empty requirements', () => {
    expect(evaluateAccessRequirement(undefined, {})).toEqual({
      allowed: true,
      reasons: [],
      missingPermissions: [],
      missingFeatures: [],
    });
  });

  it('combines permission, feature, and entitlement checks', () => {
    expect(
      evaluateAccessRequirement(
        {
          permissions: ['Billing.Invoice.*'],
          features: ['payments'],
          requireActiveEntitlement: true,
        },
        {
          permissions: ['Billing.Invoice.Read'],
          entitlement: {
            exists: true,
            status: 'Trialing',
            featureKeys: ['Payments'],
          },
        }
      )
    ).toMatchObject({
      allowed: true,
      reasons: [],
    });
  });

  it('reports missing requirements without hiding other denial reasons', () => {
    expect(
      evaluateAccessRequirement(
        {
          permissions: ['Reports.Read', 'Reports.Export'],
          features: ['analytics', 'exports'],
          internalOnly: true,
          requireActiveEntitlement: true,
        },
        {
          permissions: ['Reports.Read'],
          entitlement: {
            exists: true,
            status: 'past_due',
            featureKeys: ['analytics'],
          },
          isInternalUser: false,
        }
      )
    ).toEqual({
      allowed: false,
      reasons: ['internal-only', 'inactive-entitlement', 'missing-permissions', 'missing-features'],
      missingPermissions: ['Reports.Export'],
      missingFeatures: ['exports'],
    });
  });
});
