import 'dotenv/config';

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is required for PostgreSQL integration tests.',
  );
}

const parsed = new URL(testDatabaseUrl);
const localHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

if (
  !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
  !localHosts.has(parsed.hostname) ||
  parsed.pathname !== '/saas_test'
) {
  throw new Error(
    'Database integration commands are restricted to the local saas_test database.',
  );
}

function runNodeModule(modulePath, args) {
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) process.exit(result.status ?? 1);
}

const prismaCli = resolve(repositoryRoot, 'node_modules/prisma/build/index.js');
const resetOnly = process.argv.includes('--reset-only');

if (resetOnly) {
  runNodeModule(prismaCli, ['migrate', 'reset', '--force']);
  console.log(
    'Local saas_test database reset and rebuilt from migration history.',
  );
  process.exit(0);
}

runNodeModule(prismaCli, ['migrate', 'deploy']);
runNodeModule(resolve(repositoryRoot, 'node_modules/vitest/vitest.mjs'), [
  'run',
  '--config',
  'packages/database/vitest.integration.config.mjs',
]);
