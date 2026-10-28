import { appointmentApi, managementApi } from '../services/api.js';
import { mountScreen, renderError, toneForStatus, localWeekRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime } from '../utils/html.js';
import { weeklyPeriod, fillWeeks } from '../utils/weekly-dashboard.js';
import { weeklyChart, weeklySeries, mountWeeklyCharts } from '../components/weekly-charts.js';
import { loading, empty, badge } from '../components/ui.js';
import { renderScheduleViews, verticalScheduleMarkup } from '../components/schedule-views.js';
import { bindWeeklyCalendar, weeklyCalendarMarkup } from '../components/calendar-grid.js';
import { session } from '../state/session.js';

const root = mountScreen({ key: 'visao-geral', title: 'Visão geral', roles: ['RECEPCAO', 'MEDICO', 'GESTAO', 'ADMIN'] });
let dashboardRequest = 0;
let destroyCharts = () => {};
window.addEventListener('pagehide', () => destroyCharts());
if (root) void init();

async function init() {
  try {
    if (session.hasAnyRole('GESTAO', 'ADMIN')) {
      root.innerHTML = `<section class="panel"><div class="panel-header"><div><p class="eyebrow">Dashboard</p><h2>Movimento semanal</h2></div><label for="dashboard-period">Período</label><select id="dashboard-period"><option value="8">Últimas 8 semanas</option><option value="4">Últimas 4 semanas</option><option value="12">Últimas 12 semanas</option></select></div><p class="muted-copy">Consultas, cancelamentos e faltas em uma visão rápida da clínica.</p></section><div id="weekly-dashboard" aria-live="polite"></div>`;
      const selector = root.querySelector('#dashboard-period');
      selector.addEventListener('change', () => void renderDashboard(Number(selector.value)));
      await renderDashboard(8);
    }

    if (session.hasAnyRole('RECEPCAO', 'MEDICO', 'ADMIN')) await renderTodayAgenda();
  } catch (error) {
    renderError(root, error);
  }
}

async function renderDashboard(count) {
  const target = root.querySelector('#weekly-dashboard');
  const request = ++dashboardRequest;
  destroyCharts();
  destroyCharts = () => {};
  target.innerHTML = loading('Carregando movimento semanal...');
  const { from, to } = weeklyPeriod(count);
  try {
    const report = await managementApi.analysis(from, to, 'APPOINTMENTS', 'WEEK');
    if (request !== dashboardRequest) return;
    const weeks = fillWeeks(report.rows, from, to);
    const totals = weeklySeries.map(series => ({ ...series, total: weeks.reduce((sum, week) => sum + week[series.key], 0) }));
    const params = new URLSearchParams({ from, to, type: 'APPOINTMENTS', groupBy: 'WEEK' });
    target.innerHTML = `<div class="metric-grid weekly-totals">${totals.map(series => `<article class="metric-card"><span>${series.label}</span><strong>${series.total.toLocaleString('pt-BR')}</strong><small>No período selecionado</small></article>`).join('')}</div>
      <p class="muted-copy">${escapeHtml(from)} a ${escapeHtml(to)} · America/Sao_Paulo · semana atual parcial até hoje.</p>
      ${totals[0].total ? '' : empty('Nenhum agendamento neste período. As semanas são exibidas com zero.')}
      <div class="weekly-charts">${weeklyChart('line')}${weeklyChart('column')}</div>
      <section class="panel"><div class="panel-header"><h2>Valores por semana</h2><a class="secondary-button" href="../relatorios/relatorios.html?${escapeHtml(params.toString())}">Analisar consultas</a></div>
      <p class="muted-copy">Consultas = todos os agendamentos pela data prevista. Cancelamentos e faltas são subconjuntos desse total, conforme a situação atual. Semanas de segunda a domingo, limitadas ao período.</p>
      <div class="table-wrap"><table><caption class="muted-copy">Movimento semanal do período selecionado</caption><thead><tr><th scope="col">Início da semana</th>${weeklySeries.map(series => `<th scope="col">${series.label}</th>`).join('')}</tr></thead><tbody>${weeks.map(week => `<tr><th scope="row">${escapeHtml(week.key)}</th>${weeklySeries.map(series => `<td>${week[series.key]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <details class="weekly-provenance"><summary>Origem dos dados</summary><dl>${[['Execução', report.metadata.reportRunId], ['Gerado em', formatDateTime(report.metadata.generatedAt)], ['Gerado por', report.metadata.generatedBy], ['Definições', report.metadata.definitionVersion], ['Filtros', JSON.stringify(report.metadata.filters)], ['Fontes', report.metadata.source], ['Correlation ID', report.metadata.correlationId]].map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(String(value ?? 'Indisponível'))}</dd>`).join('')}</dl></details></section>`;
    destroyCharts = mountWeeklyCharts(target, weeks);
  } catch (error) {
    if (request !== dashboardRequest) return;
    renderError(target, error);
    const retry = document.createElement('button');
    retry.className = 'secondary-button';
    retry.textContent = 'Tentar novamente';
    retry.addEventListener('click', () => void renderDashboard(count));
    target.append(retry);
  }
}

async function renderTodayAgenda() {
  const [from, to] = localWeekRange();
  const rows = await appointmentApi.calendar(from, to);
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.innerHTML = `<div class="panel-header"><div><h2>Agenda da semana</h2><p class="muted-copy">${rows.length} ${rows.length === 1 ? 'agendamento' : 'agendamentos'}</p></div>
    <a class="secondary-button" href="../agenda/agenda.html">Abrir agenda completa</a></div><section data-today-views aria-label="Visualização da agenda de hoje"></section>`;
  root.append(panel);

  const appointments = rows.map(appointment => ({
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    appointmentId: appointment.appointmentId,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    specialtyName: appointment.specialtyName,
    maskedPatientName: appointment.maskedPatientName,
    status: appointment.status,
    detail: 'Consulta na agenda'
  }));
  let selectedGridWeek = '';
  renderScheduleViews(panel.querySelector('[data-today-views]'), {
    horizontal: () => rows.length ? `<div class="table-wrap"><table><thead><tr><th>Horário</th><th>Status</th></tr></thead><tbody>${rows.map(appointment => `
      <tr><td>${escapeHtml(formatDateTime(appointment.startsAt))}</td><td>${badge(appointment.status, toneForStatus(appointment.status))}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhuma consulta hoje.'),
    vertical: () => verticalScheduleMarkup(appointments, 'Nenhuma consulta nesta semana.'),
    grid: () => weeklyCalendarMarkup(appointments, selectedGridWeek, 'Nenhuma consulta nesta semana.'),
    onRender: (view, content, refresh) => {
      if (view === 'grid') bindWeeklyCalendar(content, appointments, week => { selectedGridWeek = week; refresh(); });
    }
  });
}
