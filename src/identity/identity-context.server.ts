/**
 * Identity Context Server Module
 * 
 * Server-side identity context management.
 */

import type { IdentityContextData, TenantMembership } from './types';
import { logger } from '../logging';

/**
 * Identity API fetcher type (to avoid coupling with specific API client)
 */
export type IdentityAPIFetcher = (request: Request) => Promise<IdentityContextData>;

let identityAPIFetcher: IdentityAPIFetcher | null = null;

/**
 * Configure identity API fetcher
 */
export function configureIdentityAPIFetcher(fetcher: IdentityAPIFetcher): void {
  identityAPIFetcher = fetcher;
}

// In-memory cache for identity context
const contextCache = new Map<
  string,
  {
    context: IdentityContextData;
    timestamp: number;
    version: number;
  }
>();

const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch identity context from backend
 */
export async function fetchIdentityContext(request: Request): Promise<IdentityContextData> {
  if (!identityAPIFetcher) {
    throw new Error('Identity API fetcher not configured. Call configureIdentityAPIFetcher first.');
  }

  try {
    logger.info('Fetching identity context');
    const context = await identityAPIFetcher(request);
    
    logger.debug('Identity context fetched', {
      hasAnyMembership: context.hasAnyMembership,
      hasSubscription: context.hasSubscription,
      isOnboarded: context.isOnboarded,
      membershipCount: context.memberships?.length || 0,
    });

    return context;
  } catch (error: unknown) {
    logger.error('Failed to fetch identity context', error instanceof Error ? error : undefined);

    // Check if this is a CurrentUserMissing error
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number; data?: { title?: string } } }).response?.status === 404 &&
      (error as { response?: { data?: { title?: string } } }).response?.data?.title === 'CurrentUserMissing'
    ) {
      logger.error('CurrentUserMissing error detected - session is invalid');
      const invalidSessionError = new Error('INVALID_SESSION');
      (invalidSessionError as Error & { isInvalidSession: boolean }).isInvalidSession = true;
      throw invalidSessionError;
    }

    throw error;
  }
}

/**
 * Get cached identity context or fetch fresh if needed
 */
export async function getIdentityContext(
  request: Request,
  userId: string,
  forceRefresh = false
): Promise<IdentityContextData> {
  const cacheKey = userId;
  const cached = contextCache.get(cacheKey);
  const now = Date.now();

  // Return cached if valid and not forcing refresh
  if (!forceRefresh && cached && now - cached.timestamp < CONTEXT_CACHE_TTL) {
    logger.debug('Using cached identity context for user', { userId });
    return cached.context;
  }

  // Fetch fresh context
  const context = await fetchIdentityContext(request);

  // Cache the result
  contextCache.set(cacheKey, {
    context,
    timestamp: now,
    version: context.contextVersion,
  });

  logger.debug('Cached fresh identity context for user', { userId });
  return context;
}

/**
 * Clear identity context cache for user
 */
export function clearIdentityContextCache(userId?: string): void {
  if (userId) {
    contextCache.delete(userId);
    logger.debug('Cleared identity context cache for user', { userId });
  } else {
    contextCache.clear();
    logger.debug('Cleared all identity context cache');
  }
}

/**
 * Permission fetcher type
 */
export type PermissionFetcher = (request: Request, tenantId: string) => Promise<string[]>;

let permissionFetcher: PermissionFetcher | null = null;

/**
 * Configure permission fetcher
 */
export function configurePermissionFetcher(fetcher: PermissionFetcher): void {
  permissionFetcher = fetcher;
}

/**
 * Fetch user permissions for a specific tenant
 */
export async function fetchUserPermissions(request: Request, tenantId: string): Promise<string[]> {
  if (!tenantId) {
    logger.warn('No tenant ID provided, skipping permission fetch');
    return [];
  }

  if (!permissionFetcher) {
    throw new Error('Permission fetcher not configured. Call configurePermissionFetcher first.');
  }

  try {
    return await permissionFetcher(request, tenantId);
  } catch (error) {
    logger.error('Failed to fetch user permissions', error instanceof Error ? error : undefined);
    return [];
  }
}
