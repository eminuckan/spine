import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureTenantClient,
  normalizeTenantDataPayload,
  normalizeTenantSwitchPayload,
  resetTenantClientConfig,
  useTenantStore,
} from '../../src/tenant/tenant-store';

function resetTenantStore() {
  resetTenantClientConfig();
  useTenantStore.setState({
    currentTenant: null,
    availableTenants: [],
    memberships: new Map(),
    tenantData: new Map(),
    organizations: new Map(),
    isLoading: false,
    isSwitching: false,
  });
  vi.unstubAllGlobals();
}

describe('tenant client configuration', () => {
  afterEach(() => {
    resetTenantStore();
  });

  it('normalizes common tenant data payload shapes', () => {
    expect(normalizeTenantDataPayload({ success: true, data: { id: 'tenant-1', name: 'Tenant 1' } })).toEqual({
      id: 'tenant-1',
      name: 'Tenant 1',
    });
    expect(normalizeTenantDataPayload({ workspace: { id: 'workspace-1', name: 'Workspace 1' } })).toEqual({
      id: 'workspace-1',
      name: 'Workspace 1',
    });
    expect(normalizeTenantDataPayload({ id: 'direct-1', name: 'Direct 1' })).toEqual({
      id: 'direct-1',
      name: 'Direct 1',
    });
    expect(normalizeTenantDataPayload({ success: false, data: { id: 'blocked' } })).toBeNull();
  });

  it('normalizes common tenant switch payload shapes', () => {
    expect(normalizeTenantSwitchPayload(null)).toEqual({ success: true });
    expect(
      normalizeTenantSwitchPayload({
        ok: true,
        workspace: { id: 'workspace-1', name: 'Workspace 1' },
        reload: false,
      })
    ).toEqual({
      success: true,
      tenantData: { id: 'workspace-1', name: 'Workspace 1' },
      reload: false,
      error: undefined,
    });
    expect(normalizeTenantSwitchPayload({ success: false, error: 'not-allowed' })).toEqual({
      success: false,
      tenantData: null,
      reload: undefined,
      error: 'not-allowed',
    });
  });

  it('lets apps provide their own tenant data fetcher', async () => {
    configureTenantClient({
      fetchTenantData: async ({ tenantId }) => ({
        id: tenantId,
        name: 'Workspace One',
        billingPlan: 'growth',
      }),
    });

    await useTenantStore.getState().fetchTenantData('workspace-1');

    expect(useTenantStore.getState().getTenantData('workspace-1')).toEqual({
      id: 'workspace-1',
      name: 'Workspace One',
      billingPlan: 'growth',
    });
  });

  it('lets apps provide their own tenant switcher', async () => {
    configureTenantClient({
      reloadOnSwitch: false,
      switchTenant: async ({ tenantId }) => ({
        success: true,
        tenantData: {
          id: tenantId,
          name: 'Account One',
        },
        reload: false,
      }),
    });
    useTenantStore.setState({ availableTenants: ['account-1'] });

    await useTenantStore.getState().switchTenant('account-1');

    expect(useTenantStore.getState().currentTenant).toBe('account-1');
    expect(useTenantStore.getState().getTenantData('account-1')).toEqual({
      id: 'account-1',
      name: 'Account One',
    });
    expect(useTenantStore.getState().isSwitching).toBe(false);
  });

  it('keeps a default endpoint client for simple apps', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ workspace: { id: 'workspace/1', name: 'Workspace 1' } }), {
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    configureTenantClient({ tenantDataEndpoint: '/api/workspaces' });

    await useTenantStore.getState().fetchTenantData('workspace/1');

    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces/workspace%2F1');
    expect(useTenantStore.getState().getTenantData('workspace/1')).toEqual({
      id: 'workspace/1',
      name: 'Workspace 1',
    });
  });
});
