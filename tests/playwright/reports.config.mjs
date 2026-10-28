import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const port = 5507;
const python = process.platform === 'win32' ? 'py' : 'python3';

// Interface com API simulada: não requer banco nem altera dados reais.
export default defineConfig({
  testDir: '.',
  testMatch: 'reports.spec.mjs',
  outputDir: '../../artifacts/playwright/reports-tests',
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${port}`, locale: 'pt-BR' },
  webServer: {
    command: `${python} -m http.server ${port} --directory frontend`,
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    url: `http://127.0.0.1:${port}/indicadores/indicadores.html`,
    timeout: 30000,
    reuseExistingServer: false
  }
});
