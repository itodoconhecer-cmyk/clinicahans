import { expect, test } from '@playwright/test';
import { ids, installFunctionalApi } from './support/functional-mocks.mjs';

const run = {
  summary: '10000000-0000-4000-8000-000000000001',
  analysis: '10000000-0000-4000-8000-000000000002',
  sources: '10000000-0000-4000-8000-000000000003',
  record: '10000000-0000-4000-8000-000000000004'
};
const values = {
  appointments: 1, completed: 0, noShows: 1, cancelled: 0, noShowRate: 100,
  cancellationRate: 0, averageLeadTimeDays: 2, occupancyRate: 0, occupiedMinutes: 0,
  capacityMinutes: 0, newPatients: 0, pendingExams: 0, openFollowUps: 0,
  receivables: 100, received: 60, pending: 40
};
const metadata = id => ({ reportRunId: id, generatedAt: '2024-03-01T12:00:00Z', generatedBy: 'gestao',
  from: '2024-02-01', to: '2024-02-29', timezone: 'America/Sao_Paulo',
  definitionVersion: '1', correlationId: 'trace', source: 'teste', filters: {} });

async function mockReports(page) {
  return installFunctionalApi(page, { roles: ['GESTAO'], override: call => {
    const query = new URLSearchParams(call.search);
    const type = query.get('type') || 'APPOINTMENTS';
    const financial = type === 'FINANCE';
    if (call.pathname.includes('/operational-reports/')) {
      const source = { sourceId: ids.exam, sourceDate: '2024-02-10', occurredAt: '2024-02-10T10:00:00Z', doctorName: 'Médico E2E Sintético', status: 'OPEN', value: type === 'CAPACITY' ? 120 : 1, relatedIds: type === 'CAPACITY' ? ids.waitlist : null };
      if (call.pathname.endsWith('/analysis')) return { body: { metadata: { ...metadata(run.analysis), definition: 'Criados no período; situação atual' }, type, groupBy: query.get('groupBy'), rows: [{ key: '2024-02', label: '2024-02', records: 1, value: 1 }] } };
      if (call.pathname.endsWith('/sources')) return { body: { metadata: metadata(run.sources), type, page: 0, size: 50, totalRecords: 1, records: [source] } };
      if (call.pathname.includes('/records/')) return { body: { metadata: metadata(run.record), record: source } };
    }
    if (call.pathname.endsWith('/reports/summary')) return { body: { current: values, previous: values, suggestions: [], metadata: metadata(run.summary) } };
    if (call.pathname.endsWith('/reports/analysis')) return { body: { metadata: metadata(run.analysis), type, groupBy: query.get('groupBy'), rows: [{ key: '2024-02', label: '2024-02', records: 1, completed: 0, noShows: 1, cancelled: 0, noShowRate: 100, gross: 100, received: 60, pending: 40 }] } };
    if (call.pathname.endsWith('/reports/sources')) return { body: { metadata: metadata(run.sources), type, page: 0, size: 50, totalRecords: 1, records: [{ sourceId: financial ? ids.receivable : ids.appointment, occurredAt: '2024-02-10T10:00:00Z', classification: financial ? 'PARTICULAR' : 'Médico E2E Sintético', status: financial ? 'PARTIAL' : 'NO_SHOW', amount: 100, received: 60, balance: 40 }] } };
    if (call.pathname.includes('/reports/records/')) return { body: { metadata: metadata(run.record), sourceId: financial ? ids.receivable : ids.appointment, occurredAt: '2024-02-10T10:00:00Z', doctorName: 'Médico E2E Sintético', specialty: 'Clínica geral', modality: financial ? 'PARTICULAR' : 'PRESENCIAL', status: 'NO_SHOW', amount: 100, received: 60, balance: 40 } };
    if (call.pathname.endsWith('/reports/exports')) return { body: { status: 'RECORDED' } };
    return undefined;
  } });
}

function latest(calls, suffix) {
  return calls.filter(call => call.pathname.endsWith(suffix)).at(-1);
}

test('mantém o agrupamento semanal ao abrir a análise do dashboard', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto('/relatorios/relatorios.html?from=2024-02-01&to=2024-02-29&type=APPOINTMENTS&groupBy=WEEK');
  await expect(page.getByRole('heading', { name: 'Resultados por semana' })).toBeVisible();
  await expect(page.getByLabel('Agrupar por')).toHaveValue('WEEK');
  expect(Object.fromEntries(new URLSearchParams(latest(calls, '/reports/analysis').search)))
    .toMatchObject({ from: '2024-02-01', to: '2024-02-29', groupBy: 'WEEK' });
  expect(new URLSearchParams(latest(calls, '/reports/analysis').search).has('parentRunId')).toBe(false);
});

test('preserva filtros e execução na navegação do indicador até o registro', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto('/indicadores/indicadores.html');
  await page.getByLabel('Ano', { exact: true }).fill('2024');
  await page.getByLabel('Mês', { exact: true }).fill('2');
  await page.getByLabel('Especialidade').selectOption(ids.specialty);
  await page.getByRole('combobox', { name: 'Médico', exact: true }).selectOption(ids.doctor);
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect.poll(() => new URLSearchParams(latest(calls, '/reports/summary')?.search).get('from')).toBe('2024-02-01');
  const summary = new URLSearchParams(latest(calls, '/reports/summary').search);
  expect(Object.fromEntries(summary)).toMatchObject({ from: '2024-02-01', to: '2024-02-29', doctorId: ids.doctor, specialtyId: ids.specialty });
  await page.getByRole('link', { name: 'Analisar concluídos e faltas' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados por mês' })).toBeVisible();
  const analysis = new URLSearchParams(latest(calls, '/reports/analysis').search);
  expect(Object.fromEntries(analysis)).toMatchObject({ from: '2024-02-01', to: '2024-02-29', doctorId: ids.doctor, specialtyId: ids.specialty, cohort: 'CLOSED', parentRunId: run.summary });
  await page.getByRole('button', { name: 'Rastrear origem' }).click();
  await expect(page.getByText('1 registros encontrados')).toBeVisible();
  const sources = new URLSearchParams(latest(calls, '/reports/sources').search);
  expect(Object.fromEntries(sources)).toMatchObject({ cohort: 'CLOSED', doctorId: ids.doctor, specialtyId: ids.specialty, groupBy: 'MONTH', groupValue: '2024-02', parentRunId: run.analysis });
  await page.getByRole('button', { name: 'Ver registro' }).click();
  await expect(page.getByRole('heading', { name: 'Agendamento', exact: true })).toBeVisible();
  const recordCall = calls.findLast(call => call.pathname.endsWith(`/reports/records/APPOINTMENTS/${ids.appointment}`));
  expect(new URLSearchParams(recordCall.search).get('parentRunId')).toBe(run.sources);
  await expect(page.getByText(run.record)).toBeVisible();
});

test('a coorte financeira e os filtros também acompanham a exportação', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto(`/relatorios/relatorios.html?from=2024-02-01&to=2024-02-29&type=FINANCE&cohort=PENDING&doctorId=${ids.doctor}&specialtyId=${ids.specialty}&parentRunId=${run.summary}`);
  await expect(page.getByRole('heading', { name: 'Resultados por mês' })).toBeVisible();
  await expect(page.getByLabel('População')).toHaveValue('PENDING');
  await page.getByRole('button', { name: 'Rastrear origem' }).click();
  await page.getByRole('button', { name: 'Exportar página CSV' }).click();
  await expect.poll(() => latest(calls, '/reports/exports')?.body).toMatchObject({ reportRunId: run.sources, cohort: 'PENDING', doctorId: ids.doctor, specialtyId: ids.specialty });
});

test('ao alterar o período não associa a análise ao resumo anterior', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto(`/relatorios/relatorios.html?from=2024-02-01&to=2024-02-29&type=APPOINTMENTS&cohort=FIRST_VISIT&parentRunId=${run.summary}`);
  await expect(page.getByRole('heading', { name: 'Resultados por mês' })).toBeVisible();
  expect(new URLSearchParams(latest(calls, '/reports/analysis').search).get('parentRunId')).toBe(run.summary);
  await page.getByLabel('Até', { exact: true }).fill('2024-02-28');
  await page.getByRole('button', { name: 'Gerar análise' }).click();
  await expect.poll(() => new URLSearchParams(latest(calls, '/reports/analysis').search).get('to')).toBe('2024-02-28');
  expect(new URLSearchParams(latest(calls, '/reports/analysis').search).has('parentRunId')).toBe(false);
});

test('exames mantêm a cadeia e identificam a data da origem no detalhe', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto('/indicadores/indicadores.html?from=2024-02-01&to=2024-02-29');
  await page.getByRole('link', { name: 'Analisar exames pendentes' }).click();
  await expect(page.getByRole('heading', { name: 'Resultados por mês' })).toBeVisible();
  let query = new URLSearchParams(latest(calls, '/operational-reports/analysis').search);
  expect(Object.fromEntries(query)).toMatchObject({ type: 'PENDING_EXAMS', from: '2024-02-01', to: '2024-02-29', parentRunId: run.summary });
  await page.getByRole('button', { name: 'Rastrear origem' }).click();
  await expect(page.getByRole('button', { name: 'Ver registro' })).toBeVisible();
  query = new URLSearchParams(latest(calls, '/operational-reports/sources').search);
  expect(Object.fromEntries(query)).toMatchObject({ groupBy: 'MONTH', groupValue: '2024-02', parentRunId: run.analysis });
  await page.getByRole('button', { name: 'Ver registro' }).click();
  await expect(page.getByText(run.record)).toBeVisible();
  query = new URLSearchParams(latest(calls, `/operational-reports/records/${ids.exam}`).search);
  expect(Object.fromEntries(query)).toMatchObject({ groupValue: '2024-02', sourceDate: '2024-02-10', parentRunId: run.sources });
});

test('ocupação separa numerador e denominador e capacidade rastreia ocorrência', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto('/indicadores/indicadores.html?from=2024-02-01&to=2024-02-29');
  const occupied = page.getByRole('link', { name: 'Analisar minutos ocupados' });
  const capacity = page.getByRole('link', { name: 'Analisar capacidade' });
  await expect(occupied).toHaveAttribute('href', /type=OCCUPIED/);
  await expect(capacity).toHaveAttribute('href', /type=CAPACITY/);
  await capacity.click();
  await expect(page.getByRole('heading', { name: 'Resultados por mês' })).toBeVisible();
  await expect(page.getByLabel('Agrupar por').locator('option')).toHaveText(['Mês', 'Ano', 'Dia', 'Especialidade', 'Médico']);
  await page.getByRole('button', { name: 'Rastrear origem' }).click();
  await page.getByRole('button', { name: 'Ver registro' }).click();
  await expect(page.locator('#record-content').getByText('120.0 min')).toBeVisible();
  await expect(page.getByText(ids.waitlist)).toBeVisible();
  const query = new URLSearchParams(latest(calls, `/operational-reports/records/${ids.exam}`).search);
  expect(Object.fromEntries(query)).toMatchObject({ type: 'CAPACITY', sourceDate: '2024-02-10', parentRunId: run.sources });
});

test('não consulta a API quando a data escolhida não existe', async ({ page }) => {
  const calls = await mockReports(page);
  await page.goto('/indicadores/indicadores.html');
  await expect(page.getByRole('link', { name: 'Analisar agendamentos', exact: true }).first()).toBeVisible();
  const before = calls.filter(call => call.pathname.endsWith('/reports/summary')).length;
  await page.getByLabel('Ano', { exact: true }).fill('2023');
  await page.getByLabel('Mês', { exact: true }).fill('2');
  await page.getByLabel('Dia', { exact: true }).fill('29');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Informe uma data válida' })).toBeVisible();
  expect(calls.filter(call => call.pathname.endsWith('/reports/summary'))).toHaveLength(before);
});
