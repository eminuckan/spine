/**
 * API Client Types
 */

// Re-export Logger from logging to avoid duplication
export type { LoggerConfig as Logger } from '../logging/types';

export interface APIConfig {
  basePath: string;
  accessToken?: string;
  headers: Record<string, string>;
  tenantId: string;
  baseOptions?: {
    timeout?: number;
  };
}

export interface CreateAPIConfigOptions {
  requireTenant?: boolean;
  includeAuth?: boolean;
  tenantId?: string;
  customHeaders?: Record<string, string>;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  traceId: string;
  requestId?: string;
  instance?: string;
  meta?: {
    errors?: ValidationError[];
    [key: string]: unknown;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: unknown) => boolean;
}

/**
 * API Logger interface for dependency injection (simplified)
 */
export interface APILogger {
  debug?: (message: string, context?: Record<string, unknown>) => void;
  info?: (message: string, context?: Record<string, unknown>) => void;
  warn?: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  error?: (message: string, error?: Error, context?: Record<string, unknown>) => void;
}

/**
 * Function type for getting access token from request
 */
export type GetAccessTokenFn = (request: Request) => Promise<string | null>;

/**
 * Function type for getting current tenant from request
 */
export type GetCurrentTenantFn = (request: Request) => Promise<string | null>;

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  success: boolean;
  newAccessToken?: string;
  shouldLogout?: boolean;
  error?: string;
}

/**
 * Function type for attempting token refresh
 */
export type TokenRefreshFn = (request: Request) => Promise<TokenRefreshResult>;
