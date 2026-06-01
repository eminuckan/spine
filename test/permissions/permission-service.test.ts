import { describe, expect, it } from 'vitest';
import { PermissionChecker } from '../../src/permissions/permission-service';

describe('PermissionChecker', () => {
  it('checks AND and OR permission groups', () => {
    const checker = new PermissionChecker(['Reports.Read']);

    expect(checker.hasPermissions(['Reports.Read', 'Reports.Export'], { operator: 'OR' })).toEqual({
      hasPermission: true,
      matchedPermissions: ['Reports.Read'],
      missingPermissions: ['Reports.Export'],
    });
    expect(checker.hasPermissions(['Reports.Read', 'Reports.Export'], { operator: 'AND' })).toEqual({
      hasPermission: false,
      matchedPermissions: ['Reports.Read'],
      missingPermissions: ['Reports.Export'],
    });
  });

  it('matches wildcard requirement patterns', () => {
    const checker = new PermissionChecker(['Billing.Invoice.Read']);

    expect(
      checker.hasPermissions(['Billing.Invoice.*'], {
        wildcard: true,
      })
    ).toMatchObject({
      hasPermission: true,
      matchedPermissions: ['Billing.Invoice.*'],
    });
  });

  it('returns module and field-level permissions', () => {
    const checker = new PermissionChecker([
      'Billing.Invoice.View',
      'Billing.Invoice.Edit',
      'Tasks.Task.View',
    ]);

    expect(checker.hasModulePermission('Billing')).toBe(true);
    expect(checker.getModulePermissions('Billing')).toEqual([
      'Billing.Invoice.View',
      'Billing.Invoice.Edit',
    ]);
    expect(checker.getFieldPermissions('Billing', 'Invoice')).toEqual({
      canView: true,
      canEdit: true,
      canCreate: false,
      canDelete: false,
    });
  });
});
