/**
 * @propmate/core
 * 
 * Core infrastructure package for Propmate applications.
 * 
 * Modules:
 * - auth: OAuth2/OIDC authentication with route protection
 * - permissions: RBAC permission system with Zustand store
 * - tenant: Multi-tenant context management
 * - identity: User identity context with SignalR real-time updates
 * - api-client: API client configuration and error handling
 * - signalr: Real-time SignalR client
 * - query-client: TanStack Query configuration
 * - logging: Structured logging
 */

// Logging (can be used everywhere)
export * from './logging';

// Permissions (client-side)
export * from './permissions';

// Tenant (client-side)
export * from './tenant';

// Identity (client-side)
export * from './identity';

// API Client (client-side)
export * from './api-client';

// SignalR (client-side only)
export * from './signalr';

// Query Client
export * from './query-client';
