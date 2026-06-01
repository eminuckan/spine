# Installation

This guide gets a new app from zero to a working Spine integration shape.

## Requirements

- Node.js 20 or newer
- pnpm 9 or newer
- React 18 or newer when using client-side provider/hooks
- A Redis-compatible store for server sessions and OAuth state
- An OpenID Connect provider for the built-in auth flow

## Install

```bash
pnpm add @eminuckan/spine
```

For React apps, install the peer dependencies used by the provider and query modules:

```bash
pnpm add react @tanstack/react-query
```

## Environment

```bash
OIDC_AUTHORITY=https://identity.example.com/realms/demo
OIDC_CLIENT_ID=your-client
OIDC_REDIRECT_URI=http://localhost:5173/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:5173/
OIDC_CLIENT_AUTH_METHOD=none
OIDC_SCOPE="openid profile email api"
REDIS_URL=redis://localhost:6379
API_BASE_URL=http://localhost:8080
```

Use `OIDC_CLIENT_SECRET` with `OIDC_CLIENT_AUTH_METHOD=client_secret_post` or
`client_secret_basic` for confidential server-side clients.

## React Router Routes

```ts
// app/routes/auth.login.tsx
import { login } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  throw await login(request, { returnUrl: '/dashboard' });
}
```

```ts
// app/routes/auth.callback.tsx
import { handleCallback } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  return handleCallback(request);
}
```

```ts
// app/routes/auth.logout.tsx
import { logout } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  return logout(request);
}
```

```ts
// app/routes/dashboard.tsx
import { authRoute } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  return authRoute(request, async (user) => ({ user }));
}
```

## Tenant Data

Configure cookie conventions in the app layer:

```ts
import { configureTenantCookie } from '@eminuckan/spine/tenant/server';

configureTenantCookie({
  name: '__spine_tenant',
  sameSite: 'Lax',
  httpOnly: false,
});
```

Simple apps can use the default tenant client by configuring endpoint names:

```ts
import { configureTenantClient } from '@eminuckan/spine/tenant';

configureTenantClient({
  tenantDataEndpoint: '/api/tenant/data',
  tenantSwitchEndpoint: '/api/tenant/switch',
  tenantCookieName: '__spine_tenant',
});
```

Apps with different multi-tenancy contracts should provide their own client functions:

```ts
import { configureTenantClient } from '@eminuckan/spine/tenant';

configureTenantClient({
  fetchTenantData: async ({ tenantId }) => {
    const response = await fetch(`/api/workspaces/${tenantId}`);
    const payload = await response.json();
    return {
      id: payload.workspace.id,
      name: payload.workspace.displayName,
      plan: payload.workspace.plan,
    };
  },
  switchTenant: async ({ tenantId }) => {
    const response = await fetch('/api/session/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: tenantId }),
    });

    return { success: response.ok, reload: false };
  },
});
```

Use the generic client hooks for new code:

```tsx
import { useCurrentTenant, useCurrentTenantData, useTenantData } from '@eminuckan/spine/tenant';

export function TenantBadge() {
  const tenantId = useCurrentTenant();
  const tenantData = useCurrentTenantData();
  const { refreshTenantData } = useTenantData();

  return (
    <button type="button" onClick={refreshTenantData}>
      {tenantData?.name ?? tenantId ?? 'No tenant'}
    </button>
  );
}
```

The older organization-named hooks remain as deprecated compatibility aliases.

## Identity Client Contracts

Simple apps can configure browser-side identity endpoints:

```ts
import { configureIdentityStore } from '@eminuckan/spine/identity';

configureIdentityStore({
  contextEndpoint: '/api/identity/context',
  permissionsEndpoint: '/api/identity/permissions',
  logoutPath: '/auth/logout',
});
```

Apps with different response shapes can provide functions instead:

```ts
configureIdentityStore({
  fetchContext: async () => {
    const response = await fetch('/session/me');
    const payload = await response.json();

    return {
      userId: payload.user.id,
      email: payload.user.email,
      memberships: payload.accounts.map((account) => ({
        tenantId: account.id,
        tenantName: account.name,
      })),
    };
  },
  fetchPermissions: async () => {
    const response = await fetch('/session/capabilities');
    const payload = await response.json();
    return payload.capabilities;
  },
});
```

## Try the Example

```bash
cd examples/react-router-saas
pnpm install
cp .env.example .env
pnpm dev
```

The example uses React Router framework mode and includes auth routes, a protected
dashboard loader, provider wiring, and local app adapters for identity and tenant
fetching.

## Validation

For library development, run:

```bash
pnpm check
```

`pnpm check` runs the public-surface guard, TypeScript, ESLint, Vitest, and the
package build.
