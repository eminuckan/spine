/**
 * Query Client Module
 * 
 * TanStack Query configuration and utilities.
 */

// Types
export type {
  QueryLogger,
  LogoutHandler,
  QueryClientConfig,
  CachePreset,
  CachePresets,
  InvalidationHelpers,
} from './types';

// Query Client Factory
export {
  createQueryClient,
  cachePresets,
  createQueryKeyFactory,
  invalidationHelpers,
} from './query-config';
