import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtensions = new Set([
  '.cjs',
  '.js',
  '.jsx',
  '.mjs',
  '.ts',
  '.tsx',
]);
const ignoredDirectories = new Set([
  '.next',
  'coverage',
  'dist',
  'generated',
  'node_modules',
]);
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

function toRepositoryPath(path) {
  return relative(repositoryRoot, path).split(sep).join('/');
}

function collectFiles(directory, predicate) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name)
        ? []
        : collectFiles(path, predicate);
    }
    return predicate(path) ? [path] : [];
  });
}

const manifestPaths = [
  resolve(repositoryRoot, 'package.json'),
  ...collectFiles(resolve(repositoryRoot, 'apps'), (path) =>
    path.endsWith(`${sep}package.json`),
  ),
  ...collectFiles(resolve(repositoryRoot, 'packages'), (path) =>
    path.endsWith(`${sep}package.json`),
  ),
];

const manifests = manifestPaths.map((path) => ({
  path,
  directory: dirname(path),
  value: JSON.parse(readFileSync(path, 'utf8')),
}));
const workspacePackages = new Map(
  manifests
    .filter(({ value }) => typeof value.name === 'string')
    .map(({ directory, value }) => [value.name, directory]),
);

function dependencyNames(manifest) {
  return dependencySections.flatMap((section) =>
    Object.keys(manifest.value[section] ?? {}),
  );
}

function workspaceTarget(specifier, sourcePath) {
  const packageTarget = workspacePackages.get(specifier);
  if (packageTarget) return packageTarget;
  if (specifier.startsWith('.')) return resolve(dirname(sourcePath), specifier);
  return undefined;
}

function isInside(path, directory) {
  const candidate = relative(directory, path);
  return (
    candidate === '' ||
    (!candidate.startsWith('..') && !candidate.startsWith(sep))
  );
}

const appsDirectory = resolve(repositoryRoot, 'apps');
const packagesDirectory = resolve(repositoryRoot, 'packages');
const contractsDirectory = resolve(packagesDirectory, 'contracts');
const coreDirectory = resolve(packagesDirectory, 'core');
const databaseDirectory = resolve(packagesDirectory, 'database');
const integrationsDirectory = resolve(packagesDirectory, 'integrations');
const uiDirectory = resolve(packagesDirectory, 'ui');
const applicationFrameworks = new Set(['next', 'react', 'react-dom']);

function isApplicationFramework(specifier) {
  return (
    applicationFrameworks.has(specifier) ||
    specifier.startsWith('next/') ||
    specifier.startsWith('@nestjs/')
  );
}

function violationsFor(sourcePath, specifier) {
  const violations = [];
  const target = workspaceTarget(specifier, sourcePath);
  const sourceIsPackage = isInside(sourcePath, packagesDirectory);

  if (sourceIsPackage && target && isInside(target, appsDirectory)) {
    violations.push('packages must not depend on apps');
  }
  if (
    isInside(sourcePath, contractsDirectory) &&
    target &&
    isInside(target, databaseDirectory)
  ) {
    violations.push('contracts must not depend on database');
  }
  if (
    isInside(sourcePath, coreDirectory) &&
    isApplicationFramework(specifier)
  ) {
    violations.push('core must remain framework-neutral');
  }
  if (
    isInside(sourcePath, databaseDirectory) &&
    ((target && isInside(target, uiDirectory)) ||
      isApplicationFramework(specifier))
  ) {
    violations.push('database must not depend on web UI or browser frameworks');
  }
  if (
    isInside(sourcePath, integrationsDirectory) &&
    ((target && isInside(target, appsDirectory)) ||
      isApplicationFramework(specifier))
  ) {
    violations.push('integrations must not depend on applications or pages');
  }

  return violations;
}

const findings = [];

for (const manifest of manifests) {
  for (const dependency of dependencyNames(manifest)) {
    for (const message of violationsFor(manifest.path, dependency)) {
      findings.push(
        `${toRepositoryPath(manifest.path)}: ${message} (${dependency})`,
      );
    }
  }
}

const sourceFiles = [
  ...collectFiles(resolve(repositoryRoot, 'apps'), (path) =>
    sourceExtensions.has(extname(path)),
  ),
  ...collectFiles(resolve(repositoryRoot, 'packages'), (path) =>
    sourceExtensions.has(extname(path)),
  ),
];
const importPattern =
  /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const sourcePath of sourceFiles) {
  const source = readFileSync(sourcePath, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (!specifier) continue;
    for (const message of violationsFor(sourcePath, specifier)) {
      findings.push(
        `${toRepositoryPath(sourcePath)}: ${message} (${specifier})`,
      );
    }
  }
}

if (findings.length > 0) {
  console.error('Import boundary check failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    `Import boundary check passed (${sourceFiles.length} source files, ${manifests.length} workspace manifests).`,
  );
}
