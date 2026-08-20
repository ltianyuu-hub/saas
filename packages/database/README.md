# Database

This package owns the generated Prisma Client export and the PostgreSQL client
factory used by API and Worker infrastructure.

`createPrismaClient()` requires an explicit `DATABASE_URL`; it does not read or
embed credentials. Domain packages must not import this package, and business
repositories are intentionally deferred to their approved DEV tasks.

The schema and future immutable migration history live in the root `prisma/`
directory. No database connection or migration is performed by client generation.
