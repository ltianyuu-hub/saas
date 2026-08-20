import { PrismaPg } from '@prisma/adapter-pg';

import { Prisma, PrismaClient } from './generated/prisma/client';

export { Prisma, PrismaClient } from './generated/prisma/client';

export type TransactionClient = Prisma.TransactionClient;

export function createPrismaClient(databaseUrl: string): PrismaClient {
  if (databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL must be provided to create PrismaClient.');
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
