# Repository scripts

Repository-level engineering checks live here. They must remain framework-neutral
and must not contain SaaS business logic.

`check-import-boundaries.mjs` enforces the Phase 0 dependency floor:

- applications may depend on shared packages, but packages may not depend on apps;
- contracts may not depend on the database implementation;
- core may not depend on application frameworks;
- database may not depend on web UI packages or browser frameworks;
- integrations may not depend on concrete applications or pages.

The root `pnpm lint` command runs this check after ESLint. `pnpm verify` runs the
complete CI-ready lint, typecheck, test, and build gate.
