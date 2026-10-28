import reports from './reports.config.mjs';
import { defineConfig } from '@playwright/test';

export default defineConfig({ ...reports, testMatch: 'dashboard.spec.mjs',
  outputDir: '../../artifacts/playwright/dashboard-tests' });
