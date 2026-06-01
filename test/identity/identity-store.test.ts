import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureIdentityStore,
  initialIdentityContext,
  normalizeIdentityContextPayload,
  normalizeIdentityPermissionsPayload,
  resetIdentityStoreConfig,
  useIdentityStore,
} from '../../src/identity/identity-store';

function resetIdentityStore() {
  resetIdentityStoreConfig();
  useIdentityStore.setState({ context: initialIdentityContext });
  vi.unstubAllGlobals();
}

describe('identity store configuration', () => {
  afterEach(() => {
    resetIdentityStore();
  });

  it('normalizes common identity context payload shapes', () => {
    expect(normalizeIdentityContextPayload({ data: { userId: 'user-1' } })).toEqual({
      userId: 'user-1',
    });
    expect(normalizeIdentityContextPayload({ context: { email: 'user@example.test' } })).toEqual({
      email: 'user@example.test',
    });
    expect(normalizeIdentityContextPayload({ success: false, data: { userId: 'blocked' } })).toBeNull();
  });

  it('normalizes common permission payload shapes', () => {
    expect(normalizeIdentityPermissionsPayload(['Reports.Read', 1, 'Reports.Export'])).toEqual([
      'Reports.Read',
      'Reports.Export',
    ]);
    expect(normalizeIdentityPermissionsPayload({ data: { permissions: ['Billing.Read'] } })).toEqual([
      'Billing.Read',
    ]);
    expect(normalizeIdentityPermissionsPayload({ permissions: ['Users.Read'] })).toEqual([
      'Users.Read',
    ]);
  });

  it('lets apps provide their own identity context fetcher', async () => {
    configureIdentityStore({
      fetchContext: async ({ currentContext, forceRefresh }) => ({
        userId: currentContext.userId ?? 'user-1',
        email: forceRefresh ? 'fresh@example.test' : 'stale@example.test',
      }),
    });

    await useIdentityStore.getState().refreshContext();

    expect(useIdentityStore.getState().context).toMatchObject({
      userId: 'user-1',
      email: 'fresh@example.test',
      isLoading: false,
    });
  });

  it('lets apps provide their own permission fetcher', async () => {
    configureIdentityStore({
      fetchPermissions: async () => ['Workspace.Read', 'Workspace.Write'],
    });

    await useIdentityStore.getState().refreshPermissions();

    expect(useIdentityStore.getState().context.permissions).toEqual([
      'Workspace.Read',
      'Workspace.Write',
    ]);
  });

  it('keeps default endpoint clients for simple apps', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ context: { userId: 'user-1' } }), {
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    configureIdentityStore({ contextEndpoint: '/identity/me' });

    await useIdentityStore.getState().refreshContext();

    expect(fetchMock).toHaveBeenCalledWith('/identity/me?refresh=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(useIdentityStore.getState().context.userId).toBe('user-1');
  });
});
