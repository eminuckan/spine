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

// Axios Setup (server-only)
export { 
  setupAxiosInterceptors, 
  createEnhancedClient,
  type AxiosSetupOptions,
  type CreateEnhancedClientOptions,
} from './axios-setup.server';
