# Spine React Router SaaS Example

This example shows the smallest React Router app shape that can host Spine auth, tenant, permission, and provider primitives.

## Run It

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open `http://localhost:5173`.

The auth routes expect an OpenID Connect provider and a Redis instance. For local Keycloak, create a public client with the callback URL from `.env.example`.

## Important Files

- `app/routes.ts` defines the React Router route table.
- `app/routes/auth.login.tsx` starts the OIDC login flow.
- `app/routes/auth.callback.tsx` handles the OIDC callback.
- `app/routes/auth.logout.tsx` clears the local session and redirects to the provider logout endpoint.
- `app/routes/dashboard.tsx` shows a protected loader using `authRoute`.
- `app/lib/spine/providers.tsx` wires the client providers.
- `app/lib/spine/identity.server.ts` shows where a real app connects its backend identity endpoints.
- `app/lib/spine/tenant.server.ts` shows tenant cookie configuration.

Keep application-specific onboarding, billing, permissions, and generated API clients in this app layer.
