/**
 * Error Codes
 * 
 * Standard error codes from backend.
 */

export const ErrorCodes = {
  // Validation
  Validation: {
    Failed: 'ValidationFailed',
  },

  // Identity
  Identity: {
    InvalidCredentials: 'InvalidCredentials',
    UserInactive: 'UserInactive',
    TenantContextMissing: 'TenantContextMissing',
    InvalidCurrentPassword: 'InvalidCurrentPassword',
    OwnerCannotDisableMembership: 'OwnerCannotDisableMembership',
    CurrentUserMissing: 'CurrentUserMissing',
    UserNotFound: 'UserNotFound',
    EmailAlreadyExists: 'EmailAlreadyExists',
  },

  // Accounting
  Accounting: {
    OpeningBalanceLockedReconciliation: 'OpeningBalanceLockedReconciliation',
    OpeningBalanceLockedJournal: 'OpeningBalanceLockedJournal',
    SystemLocked: 'SystemLocked',
    AccountsDuplicate: 'AccountsDuplicate',
    AccountNotFound: 'AccountNotFound',
  },

  // Subscription
  Subscription: {
    SubscriptionRequired: 'SubscriptionRequired',
    SubscriptionExpired: 'SubscriptionExpired',
    FeatureNotAvailable: 'FeatureNotAvailable',
  },

  // Property Management
  PropertyManagement: {
    PropertyNotFound: 'PropertyNotFound',
    UnitNotFound: 'UnitNotFound',
    DuplicateProperty: 'DuplicateProperty',
    DuplicateUnit: 'DuplicateUnit',
  },

  // Leasing
  Leasing: {
    LeaseNotFound: 'LeaseNotFound',
    LeaseConflict: 'LeaseConflict',
    TenantNotFound: 'TenantNotFound',
    LateFeeValidationError: 'LateFeeValidationError',
  },

  // General
  NotFound: 'NotFound',
  Unauthorized: 'Unauthorized',
  Forbidden: 'Forbidden',
  InternalError: 'InternalError',
} as const;

/**
 * Check if error code is from PropertyManagement module
 */
export function isPropertyManagementError(code: string): boolean {
  return Object.values(ErrorCodes.PropertyManagement).includes(code as any);
}

/**
 * Check if error code is from Leasing module
 */
export function isLeasingError(code: string): boolean {
  return Object.values(ErrorCodes.Leasing).includes(code as any);
}
