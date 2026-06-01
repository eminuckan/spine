import { describe, expect, it } from 'vitest';
import { createAPIConfigFactory } from '../../src/api-client/api-config.server';

describe('createAPIConfigFactory', () => {
  it('uses configurable auth and tenant header names', async () => {
    const { createAPIConfig } = createAPIConfigFactory(
      async () => 'token-1',
      async () => 'workspace-1',
      undefined,
      {
        baseURL: 'https://api.example.test',
        authHeaderName: 'X-Access-Token',
        authHeaderValue: (token) => token,
        tenantHeaderName: 'X-Workspace-Id',
      }
    );

    const config = await createAPIConfig(new Request('https://app.example.test'));

    expect(config.basePath).toBe('https://api.example.test');
    expect(config.headers).toMatchObject({
      'X-Access-Token': 'token-1',
      'X-Workspace-Id': 'workspace-1',
    });
    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers['X-Tenant-Id']).toBeUndefined();
  });

  it('lets apps fully own auth and tenancy headers', async () => {
    const { createAPIConfig } = createAPIConfigFactory(
      async () => 'token-1',
      async () => 'account-1',
      undefined,
      {
        authHeaderName: null,
        tenantHeaderName: null,
        buildHeaders: ({ accessToken, tenantId }) => ({
          Cookie: `access=${accessToken}; account=${tenantId}`,
        }),
      }
    );

    const config = await createAPIConfig(new Request('https://app.example.test'));

    expect(config.headers.Cookie).toBe('access=token-1; account=account-1');
    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers['X-Tenant-Id']).toBeUndefined();
  });
});
