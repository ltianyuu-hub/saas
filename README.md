# SaaS V1 Platform

This repository is the Phase 0 monorepo skeleton for the SaaS V1 multi-tenant local group-buy platform.

- Status: V1 foundation initialization
- Project root: `E:\saas`
- Runtime: Node.js 24 LTS (`>=24 <25`)
- Package manager: pnpm 11.22.0
- Architecture: modular monolith with a separate worker process

Before development, read `AGENTS.md` and the approved specifications in `docs/baseline/`.

## Monorepo layout

- `apps/api`: NestJS HTTP API process
- `apps/worker`: NestJS worker process
- `apps/merchant-web`: merchant-facing Next.js application
- `apps/platform-web`: platform-facing Next.js application
- `apps/miniapp`: native WeChat mini-program TypeScript skeleton
- `packages/modules`: business-module boundaries (placeholders only in Phase 0)
- `packages/integrations`: third-party adapter boundaries
- `packages/*`: shared technical packages
- `prisma`: reserved for a later database task
- `infra`: infrastructure assets added by later tasks
- `scripts`: repository automation added as needed

## Commands

```text
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

No database, credentials, payment integration, or SaaS business feature is initialized in this phase.
