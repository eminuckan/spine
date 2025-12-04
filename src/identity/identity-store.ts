/**
 * Identity Store (Zustand)
 * 
 * Centralized state management for identity context.
 */

import { create } from 'zustand';
import type { IdentityContextData } from './types';

const initialContext: IdentityContextData = {
  hasAnyMembership: false,
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

interface IdentityState {
  context: IdentityContextData;

  // Actions
  setContext: (context: Partial<IdentityContextData>) => void;
  refreshContext: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  reset: () => void;
}

/**
 * Context refresh endpoint (configurable)
 */
let contextEndpoint = '/api/identity/context';
let permissionsEndpoint = '/api/identity/permissions';

/**
 * Configure identity store endpoints
 */
export function configureIdentityEndpoints(config: {
  contextEndpoint?: string;
  permissionsEndpoint?: string;
}) {
  if (config.contextEndpoint) {
    contextEndpoint = config.contextEndpoint;
  }
  if (config.permissionsEndpoint) {
    permissionsEndpoint = config.permissionsEndpoint;
  }
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  context: initialContext,

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
      set((state) => ({
        context: { ...state.context, isLoading: true },
      }));

      const response = await fetch(`${contextEndpoint}?refresh=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const newContext = await response.json();
        set({
          context: {
            ...newContext,
            isLoading: false,
            lastUpdated: new Date(),
          },
        });
        console.log('Identity context refreshed:', newContext);
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'CurrentUserMissing' || errorData.title === 'CurrentUserMissing') {
          console.error('CurrentUserMissing error - session is invalid, redirecting to logout');
          window.location.href = '/auth/logout';
          return;
        }
        console.error('Failed to refresh identity context:', response.status);
        set((state) => ({
          context: { ...state.context, isLoading: false },
        }));
      } else {
        console.error('Failed to refresh identity context:', response.status);
        set((state) => ({
          context: { ...state.context, isLoading: false },
        }));
      }
    } catch (error) {
      console.error('Error refreshing identity context:', error);
      set((state) => ({
        context: { ...state.context, isLoading: false },
      }));
    }
  },

  refreshPermissions: async () => {
    try {
      console.log('Refreshing permissions...');

      const response = await fetch(permissionsEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const permissions = result.data?.permissions || [];

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
      } else {
        console.error('Failed to refresh permissions:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
  },

  reset: () => {
    set({ context: initialContext });
  },
}));

// Convenience selectors
export const useIsOnboarded = () => useIdentityStore((state) => state.context.isOnboarded);
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
