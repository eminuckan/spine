# Codex Maintenance Plan

This document explains how Spine intends to use Codex for open source maintenance work.

## Goal

Spine is a compact infrastructure library, but the maintenance surface is broad: auth, identity, tenancy, permissions, API access, realtime clients, framework adapters, examples, tests, docs, and release workflows. Codex should reduce maintainer load while keeping human review and ownership explicit.

## Planned Workflows

- Pull request review: summarize changes, identify risk areas, suggest missing tests, and check public API impact.
- Issue triage: classify bug reports, adapter requests, backend-contract questions, and documentation gaps.
- Release workflow: verify changelog entries, package contents, CI status, and npm dry runs before publishing.
- Documentation maintenance: keep installation, backend adaptation, adapter, and module reference docs aligned with code.
- Adapter scaffolding: draft Next.js, Clerk, Supabase, Vue, and Svelte adapter experiments behind issues and review gates.
- Security hardening: review session, OIDC, redirect, cookie, and token-handling changes with focused checklists.
- Regression repair: investigate failing tests or consuming-app compatibility issues without leaking app-specific policy into core.

## Guardrails

- The maintainer makes final merge and release decisions.
- All code changes must pass `pnpm check`.
- Package contents should be checked with `npm pack --dry-run` before publishing.
- Private application code, credentials, tokens, customer data, and non-public business context should not be included in public issues or documentation.
- Codex should not scan or review repositories unless the maintainer owns them or has authorization.
- Product-specific behavior should stay in consuming apps unless it has been generalized and documented.

## API Credit Use

API credits would be used for:

- automated pull request review experiments
- issue triage and duplicate detection
- release checklist automation
- security-focused reviews for auth and session code
- adapter proof-of-concept generation
- documentation drift checks between source and public docs

These are core OSS maintenance tasks, not product-specific development work.

## Success Signals

- Faster response time on issues and pull requests.
- More complete adapter examples without expanding core policy.
- Fewer release mistakes.
- Better test coverage for security-sensitive code.
- Clearer docs for teams integrating Spine into different SaaS backends.
