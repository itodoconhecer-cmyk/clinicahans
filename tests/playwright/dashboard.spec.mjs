import { test, expect } from '@playwright/test';
import { installFunctionalApi } from './support/functional-mocks.mjs';

async function dashboardApi(page, options = {}) {
  return installFunctionalApi(page, { roles: options.roles || ['GESTAO'], override: call => {
    if (!call.pathname.endsWith('/reports/analysis')) return undefined;
    if (options.error) return { status: 500, body: { message: 'Falha ao consultar movimento semanal' } };
    const query = new URLSearchParams(call.search);
    return { body: { rows: options.empty ? [] : [
      { key: query.get('from'), records: 10, cancelled: 2, noShows: 1 }
    ], metadata: { from: query.get('from'), to: query.get('to'), reportRunId: 'weekly-run',
      generatedAt: '2026-10-27T12:00:00Z', generatedBy: 'gestao', definitionVersion: '1',
      timezone: 'America/Sao_Paulo', filters: { groupBy: 'WEEK' }, source: 'appointment', correlationId: 'weekly-trace' } } };
  } });
}

test('mostra duas visualizações, totais e semanas sem movimento e troca o período', async ({ page }) => {
  const calls = await dashboardApi(page);
  await page.goto('/visao-geral/visao-geral.html');
  await expect(page.locator('.weekly-chart-container svg.highcharts-root')).toHaveCount(2);
  await expect(page.locator('.weekly-totals strong')).toHaveText(['10', '2', '1']);
  const chartState = await page.evaluate(() => window.Highcharts.charts.filter(Boolean).map(chart => ({
    type: chart.options.chart.type, series: chart.series.map(series => series.yData || series.options.data)
  })));
  expect(chartState.map(chart => chart.type)).toEqual(['line', 'column']);
  expect(chartState[0].series.map(values => values[0])).toEqual([10, 2, 1]);
  await page.locator('[data-weekly-chart="line"] .highcharts-legend-item').first().click();
  expect(await page.evaluate(() => window.Highcharts.charts.filter(Boolean)[0].series[0].visible)).toBe(false);
  await expect(page.locator('#weekly-dashboard tbody tr')).toHaveCount(8);
  await expect(page.locator('#weekly-dashboard tbody tr').nth(1).locator('td')).toHaveText(['0', '0', '0']);
  await page.getByLabel('Período', { exact: true }).selectOption('4');
  await expect(page.locator('#weekly-dashboard tbody tr')).toHaveCount(4);
  await expect(page.locator('.weekly-chart-container svg.highcharts-root')).toHaveCount(2);
  expect(await page.evaluate(() => window.Highcharts.charts.filter(Boolean).length)).toBe(2);
  const last = calls.filter(call => call.pathname.endsWith('/reports/analysis')).at(-1);
  expect(new URLSearchParams(last.search).get('groupBy')).toBe('WEEK');
  await expect(page.getByRole('link', { name: 'Analisar consultas' })).toHaveAttribute('href', /groupBy=WEEK/);
  await expect(page.getByRole('link', { name: 'Analisar consultas' })).not.toHaveAttribute('href', /parentRunId/);
  await page.getByText('Origem dos dados', { exact: true }).click();
  await expect(page.getByText('weekly-trace', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('mantém a tabela quando a biblioteca não carrega', async ({ page }) => {
  await dashboardApi(page);
  await page.route('**/vendor/highcharts/*.js', route => route.abort());
  await page.goto('/visao-geral/visao-geral.html');
  await expect(page.getByText(/Não foi possível carregar os gráficos/)).toHaveCount(2);
  await expect(page.locator('#weekly-dashboard tbody tr')).toHaveCount(8);
  await expect(page.locator('.weekly-totals strong')).toHaveText(['10', '2', '1']);
});

test('exibe vazio com zeros', async ({ page }) => {
  await dashboardApi(page, { empty: true });
  await page.goto('/visao-geral/visao-geral.html');
  await expect(page.getByText(/Nenhum agendamento neste período/)).toBeVisible();
  await expect(page.locator('.weekly-totals strong')).toHaveText(['0', '0', '0']);
  await expect(page.locator('.weekly-chart-container svg.highcharts-root')).toHaveCount(2);
});

test('permite tentar novamente após erro', async ({ page }) => {
  const options = { error: true };
  await dashboardApi(page, options);
  await page.goto('/visao-geral/visao-geral.html');
  await expect(page.getByText('Falha ao consultar movimento semanal')).toBeVisible();
  options.error = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.weekly-chart-container svg.highcharts-root')).toHaveCount(2);
});

test('recepção mantém a agenda sem consultar relatórios gerenciais', async ({ page }) => {
  const calls = await dashboardApi(page, { roles: ['RECEPCAO'] });
  await page.goto('/visao-geral/visao-geral.html');
  await expect(page.getByRole('heading', { name: 'Agenda da semana' })).toBeVisible();
  expect(calls.some(call => call.pathname.endsWith('/reports/analysis'))).toBe(false);
});
