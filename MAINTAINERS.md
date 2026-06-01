# Maintainers

## Current Maintainer

- Muhammet Emin Uckan, primary maintainer

## Maintainer Responsibilities

The maintainer owns:

- reviewing issues and pull requests
- keeping the package installable and documented
- preserving the boundary between Spine core, framework adapters, and consuming apps
- coordinating security reports
- preparing releases and changelog entries
- validating changes with `pnpm check` and package dry runs

## Review Policy

Changes should be reviewed against these questions:

- Does this solve a repeated SaaS infrastructure problem?
- Can it work across multiple apps without product-specific naming?
- Is the core still framework-agnostic?
- Does this belong in core, a framework adapter, provider guidance, or the app?
- Are public API changes documented and covered by tests?

## Release Policy

Spine follows semver. While the package is on a `0.x` line, breaking changes may still happen, but they must be documented and kept migration-friendly where practical.

Before publishing:

```bash
pnpm check
npm pack --dry-run
```

## Codex-Assisted Maintenance

Codex may be used to help with issue triage, pull request review, release checks, documentation updates, and security hardening. The maintainer remains responsible for all final decisions, shipped code, and release artifacts.

See [docs/codex-maintenance.md](docs/codex-maintenance.md) for the operating plan.
