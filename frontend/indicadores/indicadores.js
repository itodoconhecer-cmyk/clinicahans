import { managementApi } from '../services/api.js';
import { mountScreen, renderError, monthRange, queryParam } from '../shared/screen.js';
import { escapeHtml, formatMoney, formatDateTime } from '../utils/html.js';
import { loading, empty } from '../components/ui.js';
import { reportFilterFields, setupReportFilters, readReportFilters } from '../shared/report-filters.js';

const root = mountScreen({ key: 'indicadores', title: 'Indicadores', roles: ['GESTAO', 'ADMIN'] });
if (root) void init();

async function init() {
  const [monthFrom, monthTo] = monthRange();
  const from = queryParam('from') || monthFrom;
  const to = queryParam('to') || monthTo;
  const doctorId = queryParam('doctorId') || '';
  const specialtyId = queryParam('specialtyId') || '';
  root.innerHTML = `<section class="panel report-filters"><div class="panel-header"><div><p class="eyebrow">Resumo executivo</p><h2>Indicadores de gestão</h2></div></div>
    <form id="summary-filter" class="report-filter-row">${reportFilterFields({ from, to, doctorId, specialtyId })}<button class="primary-button">Aplicar filtros</button></form></section>
    <div id="summary-content">${loading('Carregando relatório...')}</div>`;
  root.querySelector('#summary-filter').addEventListener('submit', async event => {
    event.preventDefault();
    try { await loadSummary(readReportFilters(event.currentTarget)); }
    catch (error) { event.currentTarget.querySelector('[data-filter-message]').textContent = error.message; }
  });
  await setupReportFilters(root.querySelector('#summary-filter'));
  await loadSummary(readReportFilters(root.querySelector('#summary-filter')));
}

async function loadSummary(filters) {
  const target = root.querySelector('#summary-content');
  target.innerHTML = loading('Calculando indicadores...');
  try {
    const report = await managementApi.summary(filters.from, filters.to, filters);
    renderSummary(target, report, filters);
  } catch (error) {
    renderError(target, error);
  }
}

function renderSummary(target, report, filters) {
  const current = report.current;
  const previous = report.previous;
  const metadata = report.metadata;
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.doctorId) params.set('doctorId', filters.doctorId);
  if (filters.specialtyId) params.set('specialtyId', filters.specialtyId);
  if (metadata.reportRunId) params.set('parentRunId', metadata.reportRunId);
  const reportLink = (type, cohort) => `../relatorios/relatorios.html?${params.toString()}&type=${type}${cohort ? `&cohort=${cohort}` : ''}`;
  const leadTime = current.appointments > current.cancelled ? `${current.averageLeadTimeDays.toFixed(1)} dias` : 'Sem base';
  const occupancy = current.capacityMinutes ? `${current.occupancyRate.toFixed(1)}%` : 'Sem capacidade';
  const closed = current.completed + current.noShows;
  const previousClosed = previous.completed + previous.noShows;
  const noShowText = `${current.noShows} / ${closed} consultas encerradas`;
  const previousRate = previousClosed ? previous.noShowRate : null;
  const noShowDelta = !closed ? 'Sem base no período atual' : previousRate === null ? 'Sem base no período anterior' : `${delta(current.noShowRate - previousRate, ' p.p.')} vs. período anterior`;
  const leadTimeDelta = current.appointments <= current.cancelled ? 'Sem base no período atual' : previous.appointments > previous.cancelled ? `${delta(current.averageLeadTimeDays - previous.averageLeadTimeDays, ' dias')} vs. período anterior` : 'Sem base no período anterior';
  const suggestionMarkup = report.suggestions.length
    ? report.suggestions.map(item => `<article class="suggestion-card"><div><p class="eyebrow">${escapeHtml(item.ruleVersion)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.explanation)}</p><p><strong>Evidência:</strong> ${escapeHtml(item.evidence)}</p><p><strong>Ação sugerida:</strong> ${escapeHtml(item.proposedAction)}</p></div><a class="secondary-button" href="${escapeHtml(reportLink('APPOINTMENTS', item.ruleId === 'SUG-CANCEL-01' ? 'ENDED' : 'CLOSED'))}">Analisar evidências</a></article>`).join('')
    : empty('Nenhuma regra operacional foi acionada neste período.');

  target.innerHTML = `<div class="metric-grid report-metrics">
      ${metric('Agendamentos', current.appointments, compare(current.appointments, previous.appointments), reportLink('APPOINTMENTS', 'APPOINTMENTS'), 'Analisar agendamentos')}
      ${metric('Taxa de ausência', closed ? `${current.noShowRate.toFixed(1)}%` : 'Sem base', `${noShowText} · ${noShowDelta}`, reportLink('APPOINTMENTS', 'CLOSED'), 'Analisar concluídos e faltas')}
      ${metric('Cancelamentos', current.cancelled, `${closed + current.cancelled ? `${current.cancellationRate.toFixed(1)}% dos encerramentos` : 'Sem base para taxa'} · ${compare(current.cancelled, previous.cancelled)}`, reportLink('APPOINTMENTS', 'CANCELLED'), 'Analisar cancelamentos', reportLink('APPOINTMENTS', 'ENDED'), 'Analisar encerramentos')}
      ${metric('Ocupação estimada', occupancy, `${current.occupiedMinutes} de ${current.capacityMinutes} minutos · disponibilidade ativa atual menos bloqueios`, reportLink('OCCUPIED'), 'Analisar minutos ocupados', reportLink('CAPACITY'), 'Analisar capacidade')}
      ${metric('Pacientes novos', current.newPatients, `${compare(current.newPatients, previous.newPatients)} · primeira consulta concluída`, reportLink('APPOINTMENTS', 'FIRST_VISIT'), 'Analisar primeiras consultas')}
      ${metric('Tempo até a consulta', leadTime, `Média entre agendamento e início · ${leadTimeDelta}`, reportLink('APPOINTMENTS', 'LEAD_TIME'), 'Analisar tempo por consulta')}
      ${metric('Exames pendentes', current.pendingExams, 'Criados no período · situação atual', reportLink('PENDING_EXAMS'), 'Analisar exames pendentes')}
      ${metric('Acompanhamentos abertos', current.openFollowUps, 'Criados no período · situação atual', reportLink('OPEN_FOLLOWUPS'), 'Analisar acompanhamentos abertos')}
      ${metric('Recebíveis lançados', formatMoney(current.receivables), `Criados no período · ${formatMoney(current.receivables - previous.receivables)} vs. período anterior`, reportLink('FINANCE', 'RECEIVABLES'), 'Analisar recebíveis')}
      ${metric('Recebido', formatMoney(current.received), `Pagamentos da coorte · ${formatMoney(current.received - previous.received)} vs. anterior`, reportLink('FINANCE', 'RECEIVED'), 'Analisar recebíveis com pagamento')}
      ${metric('Pendente', formatMoney(current.pending), `Saldo na geração · ${formatMoney(current.pending - previous.pending)} vs. anterior`, reportLink('FINANCE', 'PENDING'), 'Analisar recebíveis pendentes')}
    </div>
    <section class="panel report-suggestions"><div class="panel-header"><div><p class="eyebrow">Próximo nível</p><h2>Detalhar por grupo</h2></div></div><p class="muted-note">Os relatórios usam os filtros aplicados acima e permitem chegar aos registros de origem.</p><div class="report-links"><a class="secondary-button" href="${reportLink('APPOINTMENTS')}">Analisar agendamentos</a><a class="secondary-button" href="${reportLink('FINANCE')}">Analisar financeiro</a></div></section>
    <section class="panel report-suggestions"><div class="panel-header"><div><p class="eyebrow">Sugestões explicáveis</p><h2>Sinais para revisão operacional</h2></div></div><div class="suggestion-list">${suggestionMarkup}</div><p class="muted-note">As sugestões mostram regra, versão, evidência e ação proposta. Elas não executam alterações nem fazem recomendações clínicas.</p></section>
    <section class="panel report-provenance"><div><p class="eyebrow">Rastreabilidade</p><h2>Origem desta execução</h2></div><dl><div><dt>Execução</dt><dd>${escapeHtml(metadata.reportRunId)}</dd></div><div><dt>Gerado em</dt><dd>${escapeHtml(formatDateTime(metadata.generatedAt))}</dd></div><div><dt>Gerado por</dt><dd>${escapeHtml(metadata.generatedBy)}</dd></div><div><dt>Período e fuso</dt><dd>${escapeHtml(metadata.from)} a ${escapeHtml(metadata.to)} · ${escapeHtml(metadata.timezone)}</dd></div><div><dt>Filtros</dt><dd>${escapeHtml(JSON.stringify(metadata.filters))}</dd></div><div><dt>Definições</dt><dd>${escapeHtml(metadata.definitionVersion)}</dd></div><div><dt>Correlation ID</dt><dd><code>${escapeHtml(metadata.correlationId || 'indisponível')}</code></dd></div><div><dt>Fontes</dt><dd>${escapeHtml(metadata.source)}</dd></div></dl><p class="muted-note">Ausência = faltas ÷ (consultas concluídas + faltas). Cancelamento = cancelamentos ÷ estados encerrados. Ocupação usa a disponibilidade recorrente ativa na data de geração menos bloqueios; como a agenda não tem histórico de vigência, valide essa estimativa para períodos passados. Paciente novo = primeira consulta concluída registrada no sistema. A especialidade corresponde à especialidade principal atual do médico.</p></section>`;
}

function metric(label, value, detail, href = '', action = '', secondHref = '', secondAction = '') {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(detail)}</small>${href ? `<a href="${escapeHtml(href)}">${escapeHtml(action)}</a>` : ''}${secondHref ? `<a href="${escapeHtml(secondHref)}">${escapeHtml(secondAction)}</a>` : ''}</article>`;
}

function compare(current, previous) {
  if (!previous) return 'Sem base no período anterior';
  return `${delta(current - previous, '')} vs. período anterior`;
}

function delta(value, suffix) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${Number(value).toFixed(1)}${suffix}`;
}
