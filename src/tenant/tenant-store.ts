/**
 * Tenant Store (Zustand)
 * 
 * Client-side state management for tenant and organization data.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { OrganizationData } from './types';

interface TenantState {
  // State
  currentTenant: string | null;
  availableTenants: string[];
  organizations: Map<string, OrganizationData>;
  isLoading: boolean;
  isSwitching: boolean;

  // Actions
  setCurrentTenant: (tenantId: string | null) => void;
  setAvailableTenants: (tenants: string[]) => void;
  setOrganization: (tenantId: string, data: OrganizationData) => void;
  addOrganization: (tenantId: string, data: OrganizationData) => void;
  setLoading: (loading: boolean) => void;
  setSwitching: (switching: boolean) => void;

  // Async actions
  fetchOrganization: (tenantId: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;

  // Getters
  getOrganization: (tenantId: string) => OrganizationData | null;
  getCurrentOrganization: () => OrganizationData | null;
}

/**
 * Organization fetch endpoint (configurable)
 */
let organizationEndpoint = '/api/organization/get';
let tenantSwitchEndpoint = '/api/tenant/switch';

/**
 * Configure tenant store endpoints
 */
export function configureTenantEndpoints(config: {
  organizationEndpoint?: string;
  tenantSwitchEndpoint?: string;
}) {
  if (config.organizationEndpoint) {
    organizationEndpoint = config.organizationEndpoint;
  }
  if (config.tenantSwitchEndpoint) {
    tenantSwitchEndpoint = config.tenantSwitchEndpoint;
  }
}

export const useTenantStore = create<TenantState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentTenant: null,
      availableTenants: [],
      organizations: new Map(),
      isLoading: false,
      isSwitching: false,

      // Setters
      setCurrentTenant: (tenantId) => set({ currentTenant: tenantId }),

      setAvailableTenants: (tenants) => {
        set({ availableTenants: tenants });

        // Fetch organization data for all tenants
        const { organizations, fetchOrganization } = get();
        tenants.forEach((tenantId) => {
          if (!organizations.has(tenantId)) {
            fetchOrganization(tenantId);
          }
        });
      },

      setOrganization: (tenantId, data) =>
        set((state) => ({
          organizations: new Map(state.organizations).set(tenantId, data),
        })),

      addOrganization: (tenantId, data) => {
        set((state) => {
          const newOrganizations = new Map(state.organizations);
          newOrganizations.set(tenantId, data);
          return { organizations: newOrganizations };
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setSwitching: (switching) => set({ isSwitching: switching }),

      // Async actions
      fetchOrganization: async (tenantId) => {
        try {
          const response = await fetch(`${organizationEndpoint}/${tenantId}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              get().setOrganization(tenantId, result.data);
            }
          }
        } catch (error) {
          console.error('Failed to fetch organization data for tenant:', tenantId, error);
        }
      },

      switchTenant: async (tenantId) => {
        const { availableTenants } = get();

        if (!availableTenants.includes(tenantId)) {
          console.error('Tenant not available:', tenantId);
          return;
        }

        set({ isSwitching: true });

        try {
          const response = await fetch(tenantSwitchEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              set({ currentTenant: tenantId });

              // Fetch organization data if not already loaded
              const { organizations, fetchOrganization } = get();
              if (!organizations.has(tenantId)) {
                await fetchOrganization(tenantId);
              }

              // Reload the page to refresh all data with new tenant context
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Failed to switch tenant:', error);
          set({ isSwitching: false });
        }
      },

      // Getters
      getOrganization: (tenantId) => {
        const { organizations } = get();
        return organizations.get(tenantId) || null;
      },

      getCurrentOrganization: () => {
        const { currentTenant, organizations } = get();
        if (!currentTenant) return null;
        return organizations.get(currentTenant) || null;
      },
    }),
    { name: 'TenantStore' }
  )
);

/**
 * Initialize store with server data
 */
export function initializeTenantStore(
  currentTenant: string | null,
  availableTenants: string[]
) {
  const store = useTenantStore.getState();
  store.setCurrentTenant(currentTenant);
  store.setAvailableTenants(availableTenants);
}
