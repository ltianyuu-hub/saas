# Prisma database assets

`schema.prisma` is the engineering translation of the approved V1 database
baseline. `prisma.config.ts` at the repository root supplies its PostgreSQL URL.

Useful commands:

- `pnpm prisma:format`
- `pnpm prisma:validate`
- `pnpm prisma:generate`
- `pnpm test:integration:database`
- `pnpm database:test:reset` (hard-guarded to local `saas_test` only)

Generation and validation do not connect to PostgreSQL. The initial reviewed
PostgreSQL migration lives under `prisma/migrations/`; production-applied
migrations must never be edited. Integration commands require
`TEST_DATABASE_URL` and reject non-local hosts or any database name other than
`saas_test`.

See `BASELINE_MAPPING.md` for the model mapping, implemented SQL guarantees and
the application-phase guarantees that remain deferred.
