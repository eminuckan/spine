/**
 * API Client Module - Client Exports
 *
 * Client-side exports for API client module.
 */

// Types
export type {
  APIConfig,
  CreateAPIConfigOptions,
  ProblemDetails,
  ValidationError,
  RetryConfig,
  APILogger,
  GetAccessTokenFn,
  GetCurrentTenantFn,
  TokenRefreshResult,
  TokenRefreshFn,
} from './types';

// Error Codes
export { ErrorCodes } from './error-codes';

// Error Handler
export { ApiError, ErrorHandler, handleApiError } from './error-handler';

// Retry Handler (client-safe)
export {
  calculateBackoffDelay,
  isRetryableError,
  withRetry,
  fetchWithTimeout,
  createRetryFetch
} from './retry-handler';
