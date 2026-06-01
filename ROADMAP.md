# Spine Roadmap

Spine is a small, adapter-friendly foundation for SaaS frontend infrastructure. The roadmap favors reusable primitives, clear framework adapters, and backend-contract flexibility over product-specific features.

## Current Focus

- Keep the core framework-agnostic and based on Web `Request` and `Response` primitives.
- Keep application policy, permission vocabularies, setup flows, and entitlement rules in consuming apps.
- Make every backend convention configurable before adding a new abstraction.
- Preserve compatibility for existing consumers while moving toward a cleaner `1.0` API.

## Near-Term

- Publish the `0.3.x` open source reboot with generic tenant, identity, permission, API, realtime, and adapter surfaces.
- Expand the React Router example into a fuller SaaS shell with auth, tenant switching, permission gates, and API configuration.
- Add adapter authoring tests that prove new adapters can stay thin.
- Add more normalization examples for account, workspace, organization, and custom tenant contracts.
- Document migration notes from deprecated organization and subscription aliases to tenant and entitlement terminology.

## Adapter Track

- First-class Next.js adapter entry points.
- React Router adapter refinements where framework-specific helpers remove real boilerplate.
- Research notes for Vue and Svelte adapter shapes.
- Adapter request template and contribution checklist for community proposals.

## Provider Track

- Clerk identity/session adapter guidance.
- Supabase auth and Postgres-backed tenant examples.
- Auth0 and generic OpenID Connect recipes.
- Optional examples for API clients generated from OpenAPI without making any generated client mandatory.

## Core Hardening

- Broader tests for route protection and OIDC/session lifecycle behavior.
- More explicit storage abstraction boundaries for sessions and OAuth state.
- Runtime compatibility notes for Node, edge-like runtimes, and serverless deployments.
- Public API stability review before `1.0`.

## Not Planned For Core

- Product-specific route names.
- Product-specific permission constants.
- Billing plan vocabulary.
- Backend DTOs or generated SDKs.
- UI components tied to one design system.

Those belong in consuming apps or app-specific adapter packages.

## How To Propose Work

Open an issue using the relevant template and describe:

- the repeated SaaS infrastructure problem
- whether it belongs in core, a framework adapter, provider guidance, or the consuming app
- how the API can remain generic across multiple projects
- what tests or docs would prove the behavior
