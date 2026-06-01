/**
 * Error Codes
 * 
 * Generic error codes that apps can use as a starter vocabulary.
 * Domain-specific codes should live in the consuming app.
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

  // Access and entitlement
  Access: {
    EntitlementRequired: 'EntitlementRequired',
    EntitlementExpired: 'EntitlementExpired',
    FeatureNotAvailable: 'FeatureNotAvailable',
    TenantContextMissing: 'TenantContextMissing',
  },

  // General
  NotFound: 'NotFound',
  Unauthorized: 'Unauthorized',
  Forbidden: 'Forbidden',
  InternalError: 'InternalError',
} as const;
