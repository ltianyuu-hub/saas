import 'dotenv/config';

import { defineConfig } from 'prisma/config';

const validationOnlyUrl =
  'postgresql://schema_validation:schema_validation@127.0.0.1:5432/saas_validation';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma format/validate/generate do not connect. Runtime code still requires
    // an explicit DATABASE_URL through packages/database.
    url: process.env.DATABASE_URL ?? validationOnlyUrl,
  },
});
