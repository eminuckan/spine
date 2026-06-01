# Backend Adaptation

Spine should adapt to your backend, not force your backend to look like the original app it came from.

This guide covers the main extension points.

## Adaptation Categories

There are four major kinds of backend adaptation:

1. Auth claims
2. Identity endpoints
3. Permission resolution
4. Tenant conventions

## Auth Claim Mapping

Use `configureAuthClaimMapping` when your identity provider uses different claim names.

```ts
import { configureAuthClaimMapping } from '@eminuckan/spine/server';

configureAuthClaimMapping({
  subject: ['sub', 'user_id'],
  email: ['email', 'preferred_username'],
  givenName: ['given_name', 'first_name'],
  familyName: ['family_name', 'last_name'],
  permissions: ['permissions', 'scope'],
  tenantIds: ['tenant_ids'],
  tenantRoles: ['tenant_roles'],
  isOnboarded: ['is_onboarded', 'profile_complete'],
});
```

## Identity API Fetching

Use `configureIdentityAPIFetcher` to tell Spine how to fetch the current identity context.

```ts
import { configureIdentityAPIFetcher } from '@eminuckan/spine/identity/server';

configureIdentityAPIFetcher(async (request) => {
  const response = await fetch('https://api.example.com/me/context', {
    headers: {
      Authorization: request.headers.get('Authorization') ?? '',
    },
  });

  const payload = await response.json();

  return {
    userId: payload.user.id,
    email: payload.user.email,
    memberships: payload.memberships,
    hasAnyMembership: payload.memberships.length > 0,
    isOnboarded: payload.flags.isOnboarded,
    hasEntitlement: payload.flags.hasEntitlement,
    contextVersion: payload.version,
  };
});
```

## Permission Fetching

Use `configurePermissionFetcher` when permissions are loaded separately from identity context.

```ts
import { configurePermissionFetcher } from '@eminuckan/spine/identity/server';

configurePermissionFetcher(async (request, tenantId) => {
  const response = await fetch(`https://api.example.com/tenants/${tenantId}/permissions`, {
    headers: {
      Authorization: request.headers.get('Authorization') ?? '',
    },
  });

  const payload = await response.json();
  return payload.permissions;
});
```

## Client Identity Store

Simple apps can configure endpoint paths for browser-side identity refresh.

```ts
import { configureIdentityStore } from '@eminuckan/spine/identity';

configureIdentityStore({
  contextEndpoint: '/api/me/context',
  permissionsEndpoint: '/api/me/permissions',
  logoutPath: '/session/logout',
});
```

Apps with different response contracts can own the fetch and mapping logic.

```ts
configureIdentityStore({
  fetchContext: async () => {
    const response = await fetch('/session/me');
    const payload = await response.json();

    return {
      userId: payload.account.id,
      email: payload.account.email,
      memberships: payload.workspaces.map((workspace) => ({
        tenantId: workspace.id,
        tenantName: workspace.name,
      })),
    };
  },
  fetchPermissions: async () => {
    const response = await fetch('/session/capabilities');
    const payload = await response.json();
    return payload.capabilities;
  },
  onUnauthorized: ({ logoutPath }) => {
    window.location.assign(`${logoutPath}?reason=expired`);
  },
});
```

## Tenant Cookie Policy

Use `configureTenantCookie` to match your app's cookie requirements.

```ts
import { configureTenantCookie } from '@eminuckan/spine/tenant/server';

configureTenantCookie({
  name: '__app_tenant',
  httpOnly: false,
  sameSite: 'Lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
});
```

This is especially useful when:

- the tenant cookie must be client-readable
- the cookie name differs across products
- secure/samesite behavior varies by deployment model

## Tenant Resolution

Use `configureTenantResolution` so tenant helpers can derive tenant state from any identity context shape.

```ts
import { configureTenantResolution } from '@eminuckan/spine/tenant/server';
import { fetchIdentityContext } from './identity.server';

configureTenantResolution({
  identityContextFetcher: fetchIdentityContext,
  resolveInitialTenant: ({ identityContext }) => {
    return identityContext?.workspaces?.[0]?.workspaceId ?? null;
  },
  resolveAvailableTenants: ({ identityContext }) => {
    return identityContext?.workspaces?.map((workspace) => workspace.workspaceId) ?? [];
  },
});
```

The older `configureIdentityContextFetcher` helper remains available for simple
identity contexts that already expose `memberships[].tenantId`.

## Route Protection Policy

Use `configureRouteProtection` for product-specific route policy that still belongs close to auth.

```ts
import { configureRouteProtection } from '@eminuckan/spine/server';

configureRouteProtection({
  getLoginReturnUrl: ({ request }) => new URL(request.url).pathname,
  resolveRoute: async ({ protection, getIdentityContext }) => {
    const identityContext = await getIdentityContext();
    if (protection === 'auth' && identityContext?.isOnboarded === false) {
      return { location: '/setup' };
    }

    return null;
  },
});
```

Use this for framework/app coordination, not domain constants.

## Permission Route Protection

Use `configurePermissionRouteProtection` to tell Spine how to get the current session and permission context.

```ts
import { configurePermissionRouteProtection } from '@eminuckan/spine/server';

configurePermissionRouteProtection({
  getSession: async (request) => {
    return {
      user: { sub: '123' },
      accessToken: 'token',
    };
  },
  resolveContext: async () => {
    return {
      permissions: ['Identity.Users.View'],
      currentTenant: 'tenant-1',
    };
  },
});
```

## API Client Adaptation

Use `createAPIConfigFactory` to keep auth and tenant resolution centralized.

```ts
import { createAPIConfigFactory } from '@eminuckan/spine/api-client/server';

const { createAPIConfig, getAPIBaseURL } = createAPIConfigFactory(
  getAccessToken,
  getCurrentTenant,
  logger,
  {
    baseURL: process.env.API_BASE_URL,
    userAgent: 'MyApp/1.0',
    tenantHeaderName: 'X-Workspace-Id',
  }
);
```

If your backend does not use bearer auth or tenant headers, set `authHeaderName`
or `tenantHeaderName` to `null` and provide `buildHeaders`.

## Practical Rule

If the value could change from one backend to another, it should usually be configured.

Examples:

- claim names
- endpoint paths and response shapes
- logout URLs
- cookie policies
- redirect decisions
- auth and tenant header names
- permission loading

If the logic is universal infrastructure, it should usually stay in core.
