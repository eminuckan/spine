/**
 * Tenant Store (Zustand)
 * 
 * Client-side state management for tenant data.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { OrganizationData, TenantData, TenantMembership } from './types';

export interface TenantDataFetcherContext {
  tenantId: string;
  endpoint: string;
  fetch: typeof fetch;
}

export interface TenantSwitchContext {
  tenantId: string;
  endpoint: string;
  fetch: typeof fetch;
  currentTenant: string | null;
}

export interface TenantSwitchResult {
  success: boolean;
  tenantData?: TenantData | null;
  reload?: boolean;
  error?: unknown;
}

export interface TenantClientConfig {
  tenantDataEndpoint?: string;
  /** @deprecated Use tenantDataEndpoint instead. */
  organizationEndpoint?: string;
  tenantSwitchEndpoint?: string;
  tenantCookieName?: string;
  fetchTenantData?: (context: TenantDataFetcherContext) => Promise<TenantData | null>;
  switchTenant?: (context: TenantSwitchContext) => Promise<TenantSwitchResult>;
  reloadOnSwitch?: boolean;
}

export interface TenantState {
  // State
  currentTenant: string | null;
  availableTenants: string[];
  memberships: Map<string, TenantMembership>;
  tenantData: Map<string, TenantData>;
  /** @deprecated Use tenantData instead. */
  organizations: Map<string, OrganizationData>;
  isLoading: boolean;
  isSwitching: boolean;

  // Actions
  setCurrentTenant: (tenantId: string | null) => void;
  setAvailableTenants: (tenants: string[]) => void;
  setMemberships: (memberships: TenantMembership[]) => void;
  setTenantData: (tenantId: string, data: TenantData) => void;
  addTenantData: (tenantId: string, data: TenantData) => void;
  /** @deprecated Use setTenantData instead. */
  setOrganization: (tenantId: string, data: OrganizationData) => void;
  /** @deprecated Use addTenantData instead. */
  addOrganization: (tenantId: string, data: OrganizationData) => void;
  setLoading: (loading: boolean) => void;
  setSwitching: (switching: boolean) => void;

  // Async actions
  fetchTenantData: (tenantId: string) => Promise<void>;
  /** @deprecated Use fetchTenantData instead. */
  fetchOrganization: (tenantId: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;

  // Getters
  getMembership: (tenantId: string) => TenantMembership | null;
  getCurrentMembership: () => TenantMembership | null;
  getTenantName: (tenantId: string) => string;
  getTenantData: (tenantId: string) => TenantData | null;
  getCurrentTenantData: () => TenantData | null;
  /** @deprecated Use getTenantData instead. */
  getOrganization: (tenantId: string) => OrganizationData | null;
  /** @deprecated Use getCurrentTenantData instead. */
  getCurrentOrganization: () => OrganizationData | null;
}

/**
 * Tenant client endpoints and browser-visible tenant cookie (configurable).
 */
let tenantDataEndpoint = '/api/tenant/data';
let tenantSwitchEndpoint = '/api/tenant/switch';
let tenantCookieName = '__spine_tenant';
let customFetchTenantData: TenantClientConfig['fetchTenantData'] | null = null;
let customSwitchTenant: TenantClientConfig['switchTenant'] | null = null;
let reloadOnSwitch = true;

/**
 * Configure tenant client behavior for any backend contract.
 */
export function configureTenantClient(config: TenantClientConfig): void {
  if (config.tenantDataEndpoint || config.organizationEndpoint) {
    tenantDataEndpoint = config.tenantDataEndpoint ?? config.organizationEndpoint ?? tenantDataEndpoint;
  }
  if (config.tenantSwitchEndpoint) {
    tenantSwitchEndpoint = config.tenantSwitchEndpoint;
  }
  if (config.tenantCookieName) {
    tenantCookieName = config.tenantCookieName;
  }
  if (config.fetchTenantData) {
    customFetchTenantData = config.fetchTenantData;
  }
  if (config.switchTenant) {
    customSwitchTenant = config.switchTenant;
  }
  if (config.reloadOnSwitch !== undefined) {
    reloadOnSwitch = config.reloadOnSwitch;
  }
}

/**
 * Configure tenant store endpoints.
 *
 * @deprecated Use configureTenantClient for endpoint and contract customization.
 */
export function configureTenantEndpoints(config: TenantClientConfig): void {
  configureTenantClient(config);
}

export function getTenantCookieName(): string {
  return tenantCookieName;
}

export function resetTenantClientConfig(): void {
  tenantDataEndpoint = '/api/tenant/data';
  tenantSwitchEndpoint = '/api/tenant/switch';
  tenantCookieName = '__spine_tenant';
  customFetchTenantData = null;
  customSwitchTenant = null;
  reloadOnSwitch = true;
}

function asOrganizationMap(tenantDataMap: Map<string, TenantData>): Map<string, OrganizationData> {
  return tenantDataMap as unknown as Map<string, OrganizationData>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text.trim().length > 0 ? JSON.parse(text) : null;
}

export function normalizeTenantDataPayload(payload: unknown): TenantData | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (payload.success === false) {
    return null;
  }

  const nestedData = payload.data ?? payload.tenant ?? payload.workspace ?? payload.account;
  if (isRecord(nestedData)) {
    return nestedData as TenantData;
  }

  return payload as TenantData;
}

export function normalizeTenantSwitchPayload(payload: unknown): TenantSwitchResult {
  if (payload === null || payload === undefined) {
    return { success: true };
  }

  if (!isRecord(payload)) {
    return { success: false, error: payload };
  }

  const success = payload.success ?? payload.ok ?? payload.switched;
  const nestedData = payload.data ?? payload.tenant ?? payload.workspace ?? payload.account;

  return {
    success: success === undefined ? true : Boolean(success),
    tenantData: isRecord(nestedData) ? nestedData as TenantData : null,
    reload: typeof payload.reload === 'boolean' ? payload.reload : undefined,
    error: payload.error,
  };
}

async function defaultFetchTenantData({ tenantId, endpoint, fetch: fetchFn }: TenantDataFetcherContext): Promise<TenantData | null> {
  const response = await fetchFn(`${endpoint}/${encodeURIComponent(tenantId)}`);
  if (!response.ok) {
    return null;
  }

  return normalizeTenantDataPayload(await readJsonResponse(response));
}

async function defaultSwitchTenant({ tenantId, endpoint, fetch: fetchFn }: TenantSwitchContext): Promise<TenantSwitchResult> {
  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });

  if (!response.ok) {
    return { success: false, error: response.status };
  }

  return normalizeTenantSwitchPayload(await readJsonResponse(response));
}

export const useTenantStore = create<TenantState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentTenant: null,
      availableTenants: [],
      memberships: new Map(),
      tenantData: new Map(),
      organizations: new Map(),
      isLoading: false,
      isSwitching: false,

      // Setters
      setCurrentTenant: (tenantId) => set({ currentTenant: tenantId }),

      setAvailableTenants: (tenants) => {
        set({ availableTenants: tenants });

        // Fetch tenant data for all tenants
        const { tenantData, fetchTenantData } = get();
        tenants.forEach((tenantId) => {
          if (!tenantData.has(tenantId)) {
            fetchTenantData(tenantId);
          }
        });
      },

      setMemberships: (memberships) => {
        const membershipMap = new Map<string, TenantMembership>();
        memberships.forEach((membership) => {
          membershipMap.set(membership.tenantId, membership);
        });
        set({ memberships: membershipMap });
      },

      setTenantData: (tenantId, data) =>
        set((state) => ({
          tenantData: new Map(state.tenantData).set(tenantId, data),
          organizations: asOrganizationMap(new Map(state.tenantData).set(tenantId, data)),
        })),

      addTenantData: (tenantId, data) => {
        set((state) => {
          const newTenantData = new Map(state.tenantData);
          newTenantData.set(tenantId, data);
          return {
            tenantData: newTenantData,
            organizations: asOrganizationMap(newTenantData),
          };
        });
      },

      setOrganization: (tenantId, data) => get().setTenantData(tenantId, data),
      addOrganization: (tenantId, data) => get().addTenantData(tenantId, data),

      setLoading: (loading) => set({ isLoading: loading }),
      setSwitching: (switching) => set({ isSwitching: switching }),

      // Async actions
      fetchTenantData: async (tenantId) => {
        try {
          const tenantData = await (customFetchTenantData ?? defaultFetchTenantData)({
            tenantId,
            endpoint: tenantDataEndpoint,
            fetch,
          });

          if (tenantData) {
            get().setTenantData(tenantId, tenantData);
          }
        } catch (error) {
          console.error('Failed to fetch tenant data:', tenantId, error);
        }
      },

      fetchOrganization: async (tenantId) => get().fetchTenantData(tenantId),

      switchTenant: async (tenantId) => {
        const { availableTenants } = get();

        if (!availableTenants.includes(tenantId)) {
          console.error('Tenant not available:', tenantId);
          return;
        }

        set({ isSwitching: true });

        try {
          const result = await (customSwitchTenant ?? defaultSwitchTenant)({
            tenantId,
            endpoint: tenantSwitchEndpoint,
            fetch,
            currentTenant: get().currentTenant,
          });

          if (result.success) {
            set({ currentTenant: tenantId });

            if (result.tenantData) {
              get().setTenantData(tenantId, result.tenantData);
            }

            // Fetch tenant data if not already loaded
            const { tenantData, fetchTenantData } = get();
            if (!tenantData.has(tenantId)) {
              await fetchTenantData(tenantId);
            }

            set({ isSwitching: false });

            if ((result.reload ?? reloadOnSwitch) && typeof window !== 'undefined') {
              window.location.reload();
            }
          } else {
            console.error('Failed to switch tenant:', result.error ?? tenantId);
            set({ isSwitching: false });
          }
        } catch (error) {
          console.error('Failed to switch tenant:', error);
          set({ isSwitching: false });
        }
      },

      // Getters
      getMembership: (tenantId) => {
        const { memberships } = get();
        return memberships.get(tenantId) || null;
      },

      getCurrentMembership: () => {
        const { currentTenant, memberships } = get();
        if (!currentTenant) return null;
        return memberships.get(currentTenant) || null;
      },

      getTenantName: (tenantId) => {
        const { memberships, tenantData } = get();
        const membership = memberships.get(tenantId);
        if (membership?.tenantName) {
          return membership.tenantName;
        }
        if (membership?.organizationName) {
          return membership.organizationName;
        }
        return tenantData.get(tenantId)?.name || tenantId;
      },

      getTenantData: (tenantId) => {
        const { tenantData } = get();
        return tenantData.get(tenantId) || null;
      },

      getCurrentTenantData: () => {
        const { currentTenant, tenantData } = get();
        if (!currentTenant) return null;
        return tenantData.get(currentTenant) || null;
      },

      getOrganization: (tenantId) => {
        return get().getTenantData(tenantId) as OrganizationData | null;
      },

      getCurrentOrganization: () => {
        return get().getCurrentTenantData() as OrganizationData | null;
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
  availableTenants: string[],
  memberships?: TenantMembership[]
) {
  const store = useTenantStore.getState();
  store.setCurrentTenant(currentTenant);
  store.setAvailableTenants(availableTenants);
  if (memberships) {
    store.setMemberships(memberships);
  }
}
