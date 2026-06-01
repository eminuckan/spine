import { afterEach, describe, expect, it } from 'vitest';
import {
  clearActiveTenant,
  configureTenantCookie,
  getActiveTenant,
  resetTenantCookieConfig,
  setActiveTenant,
} from '../../src/tenant/tenant-cookie.server';

describe('tenant cookie server helpers', () => {
  afterEach(() => {
    resetTenantCookieConfig();
  });

  it('reads the default tenant cookie', async () => {
    const request = new Request('https://app.example.test', {
      headers: {
        Cookie: 'other=value; __spine_tenant=tenant%201',
      },
    });

    await expect(getActiveTenant(request)).resolves.toBe('tenant 1');
  });

  it('uses custom cookie settings when writing cookies', async () => {
    configureTenantCookie({
      name: '__tenant.example',
      path: '/app',
      secure: true,
      httpOnly: true,
      sameSite: 'None',
      maxAge: 60,
    });

    await expect(setActiveTenant('tenant/1')).resolves.toBe(
      '__tenant.example=tenant%2F1; Path=/app; HttpOnly; SameSite=None; Max-Age=60; Secure'
    );
    await expect(clearActiveTenant()).resolves.toBe(
      '__tenant.example=; Path=/app; HttpOnly; SameSite=None; Max-Age=0; Secure'
    );
  });

  it('reads cookie names that include regular expression characters', async () => {
    configureTenantCookie({ name: '__tenant.example' });

    const request = new Request('https://app.example.test', {
      headers: {
        Cookie: '__tenantXexample=wrong; __tenant.example=right',
      },
    });

    await expect(getActiveTenant(request)).resolves.toBe('right');
  });
});
