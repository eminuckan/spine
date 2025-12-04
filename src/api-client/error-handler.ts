/**
 * Error Handler
 * 
 * Centralized error handling with ProblemDetails parsing.
 */

import type { ProblemDetails, ValidationError } from './types';
import { ErrorCodes } from './error-codes';
import { logger } from '../logging';

/**
 * API Error Class
 */
export class ApiError extends Error {
  constructor(
    public problemDetails: ProblemDetails,
    public response: Response
  ) {
    super(problemDetails.detail);
    this.name = 'ApiError';
  }

  get code(): string {
    return this.problemDetails.title;
  }

  get status(): number {
    return this.problemDetails.status;
  }

  get isValidationError(): boolean {
    return this.code === ErrorCodes.Validation.Failed;
  }

  get validationErrors(): ValidationError[] {
    return this.problemDetails.meta?.errors ?? [];
  }

  get traceId(): string {
    return this.problemDetails.traceId;
  }
}

/**
 * Parse API error response
 */
export async function handleApiError(response: Response): Promise<never> {
  let problemDetails: ProblemDetails;

  try {
    problemDetails = await response.json();
  } catch {
    problemDetails = {
      type: `https://httpstatuses.com/${response.status}`,
      title: 'UnknownError',
      status: response.status,
      detail: response.statusText || 'An unknown error occurred',
      traceId: response.headers.get('x-trace-id') ?? 'unknown',
    };
  }

  logger.error('API request failed', undefined, {
    code: problemDetails.title,
    status: problemDetails.status,
    detail: problemDetails.detail,
    traceId: problemDetails.traceId,
  });

  throw new ApiError(problemDetails, response);
}

/**
 * Error Handler Configuration
 */
export interface ErrorHandlerConfig {
  handlers?: Partial<Record<string, (error: ApiError) => void>>;
  showToast?: boolean;
  toastMessages?: Partial<Record<string, string>>;
  onError?: (error: ApiError) => void;
  toast?: (message: string, type: 'error' | 'success' | 'info') => void;
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      showToast: true,
      ...config,
    };
  }

  handle(error: ApiError): void {
    const code = error.code;

    logger.error('Handling API Error', undefined, {
      code,
      status: error.status,
      traceId: error.traceId,
    });

    // Try custom handler first
    if (this.config.handlers?.[code]) {
      this.config.handlers[code]!(error);
      return;
    }

    // Fallback
    if (this.config.onError) {
      this.config.onError(error);
    } else {
      this.showDefaultToast(error);
    }
  }

  private showToast(message: string, type: 'error' | 'success' | 'info'): void {
    if (this.config.showToast && this.config.toast) {
      this.config.toast(message, type);
    }
  }

  private showDefaultToast(error: ApiError): void {
    const message =
      this.config.toastMessages?.[error.code] ||
      error.problemDetails.detail ||
      'An error occurred';
    this.showToast(message, 'error');
  }
}

/**
 * Create global error handler
 */
export function createErrorHandler(config?: ErrorHandlerConfig): ErrorHandler {
  return new ErrorHandler(config);
}

/**
 * Map validation errors to form fields
 */
export function mapValidationErrors(errors: ValidationError[]): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const error of errors) {
    const fieldName = error.field.charAt(0).toLowerCase() + error.field.slice(1);
    mapped[fieldName] = error.message;
  }
  return mapped;
}
