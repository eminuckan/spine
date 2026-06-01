/**
 * Identity Store (Zustand)
 * 
 * Centralized state management for identity context.
 */

import { create } from 'zustand';
import type { IdentityContextData } from './types';

export const initialIdentityContext: IdentityContextData = {
  hasAnyMembership: false,
  hasEntitlement: false,
  hasSubscription: false,
  isOnboarded: false,
  tenants: [],
  currentTenant: undefined,
  permissions: [],
  contextVersion: 0,
  isLoading: true,
  userId: undefined,
  email: undefined,
  firstName: undefined,
  lastName: undefined,
  displayName: undefined,
  profileImageUrl: undefined,
  phoneNumber: undefined,
  timeZone: undefined,
  addresses: undefined,
  hasOwnerMembership: false,
  memberships: undefined,
};

export interface IdentityContextFetchContext {
  endpoint: string;
  fetch: typeof fetch;
  forceRefresh: boolean;
  currentContext: IdentityContextData;
}

export interface IdentityPermissionsFetchContext {
  endpoint: string;
  fetch: typeof fetch;
  currentContext: IdentityContextData;
}

export interface IdentityState {
  context: IdentityContextData;

  // Actions
  setContext: (context: Partial<IdentityContextData>) => void;
  refreshContext: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  reset: () => void;
}

export interface IdentityUnauthorizedDetails {
  reason: 'current-user-missing' | 'unauthorized';
  logoutPath: string;
  response?: Response;
}

export interface IdentityStoreConfig {
  contextEndpoint?: string;
  permissionsEndpoint?: string;
  logoutPath?: string;
  fetcher?: typeof fetch;
  fetchContext?: (context: IdentityContextFetchContext) => Promise<Partial<IdentityContextData> | null>;
  fetchPermissions?: (context: IdentityPermissionsFetchContext) => Promise<string[]>;
  onUnauthorized?: (details: IdentityUnauthorizedDetails) => void;
}

const DEFAULT_IDENTITY_STORE_CONFIG: Required<
  Pick<IdentityStoreConfig, 'contextEndpoint' | 'permissionsEndpoint' | 'logoutPath' | 'fetcher'>
> = {
  contextEndpoint: '/api/identity/context',
  permissionsEndpoint: '/api/identity/permissions',
  logoutPath: '/auth/logout',
  fetcher: (input, init) => fetch(input, init),
};

let identityStoreConfig: IdentityStoreConfig = {
  ...DEFAULT_IDENTITY_STORE_CONFIG,
};

class IdentityUnauthorizedError extends Error {
  constructor(
    readonly reason: IdentityUnauthorizedDetails['reason'],
    readonly response?: Response
  ) {
    super(reason);
    this.name = 'IdentityUnauthorizedError';
  }
}

function getIdentityStoreConfig(): IdentityStoreConfig & typeof DEFAULT_IDENTITY_STORE_CONFIG {
  return {
    ...DEFAULT_IDENTITY_STORE_CONFIG,
    ...identityStoreConfig,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function appendRefreshParam(endpoint: string, forceRefresh: boolean): string {
  if (!forceRefresh) {
    return endpoint;
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}refresh=true`;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  return text.trim().length > 0 ? JSON.parse(text) : null;
}

export function normalizeIdentityContextPayload(payload: unknown): Partial<IdentityContextData> | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (payload.success === false) {
    return null;
  }

  const nestedContext = payload.context ?? payload.data ?? payload.identity ?? payload.user;
  if (isRecord(nestedContext)) {
    return nestedContext as Partial<IdentityContextData>;
  }

  return payload as Partial<IdentityContextData>;
}

export function normalizeIdentityPermissionsPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.filter((permission): permission is string => typeof permission === 'string');
  }

  if (!isRecord(payload)) {
    return [];
  }

  const nestedPermissions =
    payload.permissions ??
    (isRecord(payload.data) ? payload.data.permissions : payload.data) ??
    (isRecord(payload.context) ? payload.context.permissions : undefined);

  return Array.isArray(nestedPermissions)
    ? nestedPermissions.filter((permission): permission is string => typeof permission === 'string')
    : [];
}

async function defaultFetchIdentityContext({
  endpoint,
  fetch: fetchFn,
  forceRefresh,
}: IdentityContextFetchContext): Promise<Partial<IdentityContextData> | null> {
  const response = await fetchFn(appendRefreshParam(endpoint, forceRefresh), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    return normalizeIdentityContextPayload(await readJsonResponse(response));
  }

  if (response.status === 404) {
    const errorData = await readJsonResponse(response).catch(() => ({}));
    if (
      isRecord(errorData) &&
      (errorData.code === 'CurrentUserMissing' || errorData.title === 'CurrentUserMissing')
    ) {
      throw new IdentityUnauthorizedError('current-user-missing', response);
    }
  }

  if (response.status === 401) {
    throw new IdentityUnauthorizedError('unauthorized', response);
  }

  console.error('Failed to refresh identity context:', response.status);
  return null;
}

async function defaultFetchIdentityPermissions({
  endpoint,
  fetch: fetchFn,
}: IdentityPermissionsFetchContext): Promise<string[]> {
  const response = await fetchFn(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    return normalizeIdentityPermissionsPayload(await readJsonResponse(response));
  }

  if (response.status === 401) {
    throw new IdentityUnauthorizedError('unauthorized', response);
  }

  console.error('Failed to refresh permissions:', response.status);
  return [];
}

function handleUnauthorized(details: Omit<IdentityUnauthorizedDetails, 'logoutPath'>): void {
  const config = getIdentityStoreConfig();
  const unauthorizedDetails: IdentityUnauthorizedDetails = {
    ...details,
    logoutPath: config.logoutPath,
  };

  if (config.onUnauthorized) {
    config.onUnauthorized(unauthorizedDetails);
    return;
  }

  if (typeof window !== 'undefined') {
    window.location.href = config.logoutPath;
  }
}

/**
 * Configure the identity store for different app/back-end conventions.
 */
export function configureIdentityStore(config: IdentityStoreConfig): void {
  identityStoreConfig = {
    ...identityStoreConfig,
    ...config,
  };
}

/**
 * Reset identity store configuration to the built-in defaults.
 */
export function resetIdentityStoreConfig(): void {
  identityStoreConfig = {
    ...DEFAULT_IDENTITY_STORE_CONFIG,
  };
}

/**
 * Backward-compatible endpoint-only configuration helper.
 */
export function configureIdentityEndpoints(config: {
  contextEndpoint?: string;
  permissionsEndpoint?: string;
}): void {
  configureIdentityStore(config);
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  context: initialIdentityContext,

  setContext: (newContext) => {
    set((state) => ({
      context: {
        ...state.context,
        ...newContext,
        isLoading: false,
        lastUpdated: new Date(),
      },
    }));
  },

  refreshContext: async () => {
    try {
      const config = getIdentityStoreConfig();

      set((state) => ({
        context: { ...state.context, isLoading: true },
      }));

      const fetchContext = config.fetchContext ?? defaultFetchIdentityContext;
      const newContext = await fetchContext({
        endpoint: config.contextEndpoint,
        fetch: config.fetcher,
        forceRefresh: true,
        currentContext: get().context,
      });

      if (newContext) {
        set({
          context: {
            ...get().context,
            ...newContext,
            isLoading: false,
            lastUpdated: new Date(),
          },
        });
        console.log('Identity context refreshed:', newContext);
      } else {
        set((state) => ({
          context: { ...state.context, isLoading: false },
        }));
      }
    } catch (error) {
      if (error instanceof IdentityUnauthorizedError) {
        handleUnauthorized({
          reason: error.reason,
          response: error.response,
        });
        return;
      }

      console.error('Error refreshing identity context:', error);
      set((state) => ({
        context: { ...state.context, isLoading: false },
      }));
    }
  },

  refreshPermissions: async () => {
    try {
      const config = getIdentityStoreConfig();

      console.log('Refreshing permissions...');

      const fetchPermissions = config.fetchPermissions ?? defaultFetchIdentityPermissions;
      const permissions = await fetchPermissions({
        endpoint: config.permissionsEndpoint,
        fetch: config.fetcher,
        currentContext: get().context,
      });

      set((state) => ({
        context: {
          ...state.context,
          permissions,
          lastUpdated: new Date(),
        },
      }));

      console.log('Permissions refreshed:', {
        count: permissions.length,
      });
    } catch (error) {
      if (error instanceof IdentityUnauthorizedError) {
        handleUnauthorized({
          reason: error.reason,
          response: error.response,
        });
        return;
      }

      console.error('Error refreshing permissions:', error);
    }
  },

  reset: () => {
    set({ context: initialIdentityContext });
  },
}));

// Convenience selectors
export const useIsOnboarded = () => useIdentityStore((state) => state.context.isOnboarded);
export const useHasEntitlement = () => useIdentityStore((state) => state.context.hasEntitlement ?? state.context.hasSubscription);
/** @deprecated Use useHasEntitlement or an app-specific selector instead. */
export const useHasSubscription = () => useIdentityStore((state) => state.context.hasSubscription);
export const useUserTenants = () =>
  useIdentityStore((state) => ({
    tenants: state.context.tenants,
    currentTenant: state.context.currentTenant,
  }));
export const useUserPermissions = () => useIdentityStore((state) => state.context.permissions);
export const useIdentityContext = () => {
  const context = useIdentityStore((state) => state.context);
  const refreshContext = useIdentityStore((state) => state.refreshContext);
  const refreshPermissions = useIdentityStore((state) => state.refreshPermissions);

  return { context, refreshContext, refreshPermissions };
};
