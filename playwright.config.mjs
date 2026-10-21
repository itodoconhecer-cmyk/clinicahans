import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Defina E2E_DATABASE_URL para um PostgreSQL de teste dedicado.');
}

const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = parsedDatabaseUrl.pathname.slice(1);
if (!/(^|[_-])(e2e|test)([_-]|$)/i.test(databaseName)) {
  throw new Error(`E2E_DATABASE_URL aponta para "${databaseName}". Use um banco com nome contendo e2e ou test.`);
}

const apiPort = Number(process.env.E2E_API_PORT || 8081);
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5501);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;
const jdbcDatabaseUrl = `jdbc:postgresql://${parsedDatabaseUrl.host}${parsedDatabaseUrl.pathname}${parsedDatabaseUrl.search}`;
const javaVersionOverride = process.env.E2E_JAVA_VERSION;
if (javaVersionOverride && !/^\d{2}$/.test(javaVersionOverride)) {
  throw new Error('E2E_JAVA_VERSION deve conter somente a versão principal do Java, por exemplo 24.');
}
const javaVersionArgument = javaVersionOverride ? `-Djava.version=${javaVersionOverride} ` : '';
const runPassword = process.env.E2E_ADMIN_PASSWORD;
if (!runPassword) {
  throw new Error('Defina E2E_ADMIN_PASSWORD para a conta ADMIN isolada dos testes.');
}

const serverEnvironment = {
  DB_URL: jdbcDatabaseUrl,
  DB_USER: decodeURIComponent(parsedDatabaseUrl.username),
  DB_PASSWORD: decodeURIComponent(parsedDatabaseUrl.password),
  JWT_SECRET: process.env.E2E_JWT_SECRET || randomBytes(48).toString('base64'),
  BOOTSTRAP_ADMIN_USERNAME: process.env.E2E_ADMIN_USERNAME || 'playwright-admin',
  BOOTSTRAP_ADMIN_PASSWORD: runPassword,
  SERVER_PORT: String(apiPort),
  CORS_ALLOWED_ORIGINS: frontendBaseUrl,
  BUSINESS_ZONE: 'America/Sao_Paulo'
};

const python = process.platform === 'win32' ? 'py' : 'python3';
const staticServerCommand = `${python} -m http.server ${frontendPort} --directory frontend`;

export default defineConfig({
  testDir: './tests/playwright',
  outputDir: './artifacts/playwright/test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './artifacts/playwright/report', open: 'never' }]
  ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: frontendBaseUrl,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    timezoneId: 'America/Sao_Paulo',
    locale: 'pt-BR',
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    trace: 'off',
    screenshot: 'off',
    actionTimeout: 10_000
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1
    }
  }],
  webServer: [
    {
      command: `mvn ${javaVersionArgument}-B -ntp -f backend/pom.xml spring-boot:run`,
      url: `${apiBaseUrl}/actuator/health`,
      name: 'Spring Boot + PostgreSQL E2E',
      timeout: 180_000,
      reuseExistingServer: false,
      env: serverEnvironment
    },
    {
      command: staticServerCommand,
      url: frontendBaseUrl,
      name: 'Frontend estático',
      timeout: 30_000,
      reuseExistingServer: false
    }
  ]
});
