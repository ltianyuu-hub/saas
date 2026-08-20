import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const nextFiles = [
  'apps/merchant-web/**/*.{js,mjs,cjs,ts,tsx}',
  'apps/platform-web/**/*.{js,mjs,cjs,ts,tsx}',
];

export default defineConfig(
  globalIgnores([
    '**/.next/**',
    '**/coverage/**',
    '**/dist/**',
    '**/node_modules/**',
    'apps/miniapp/miniprogram_npm/**',
    'packages/database/src/generated/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  ...nextVitals.map((config) => ({
    ...config,
    files: nextFiles,
    rules: {
      ...config.rules,
      '@next/next/no-html-link-for-pages': 'off',
    },
  })),
  ...nextTypeScript.map((config) => ({ ...config, files: nextFiles })),
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: [
      'apps/merchant-web/**/*.{ts,tsx}',
      'apps/platform-web/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      next: {
        rootDir: ['apps/merchant-web/', 'apps/platform-web/'],
      },
    },
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
);
