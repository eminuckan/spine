/**
 * API Client Module - Server Exports
 * 
 * Server-side exports for API client module.
 */

// Re-export everything from client
export * from './index';

// API Config Factory (server-only)
export { 
  createAPIConfigFactory,
  type APIConfigFactory,
  type APIConfigFactoryOptions,
} from './api-config.server';

// Fetch-native client setup (server-only)
export { 
  createFetchMiddleware,
  createApiClient,
  type FetchSetupOptions,
  type CreateApiClientOptions,
} from './fetch-client.server';
