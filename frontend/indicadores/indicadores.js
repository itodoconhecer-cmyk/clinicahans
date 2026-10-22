import { managementApi } from '../services/api.js';
import { mountScreen, renderError, monthRange } from '../shared/screen.js';
import { escapeHtml, formatMoney, formatDateTime } from '../utils/html.js';
import { loading, empty } from '../components/ui.js';

const root = mountScreen({ key: 'indicadores', title: 'Indicadores', roles: ['GESTAO', 'ADMIN'] });
if (root) void init();

async function init() {
  const [from, to] = monthRange();
  root.innerHTML = `<section class="panel report-filters"><div class="panel-header"><div><p class="eyebrow">Resumo executivo</p><h2>Indicadores de gestão</h2></div><a class="secondary-button" href="../relatorios/relatorios.html">Abrir análise detalhada</a></div>
    <form id="summary-filter" class="report-filter-row"><label>De<input type="date" name="from" value="${from}" required></label><label>Até<input type="date" name="to" value="${to}" required></label><button class="primary-button">Aplicar período</button></form></section>
    <div id="summary-content">${loading('Carregando relatório...')}</div>`;
  root.querySelector('#summary-filter').addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await loadSummary(String(data.get('from')), String(data.get('to')));
  });
  await loadSummary(from, to);
}

async function loadSummary(from, to) {
  const target = root.querySelector('#summary-content');
  target.innerHTML = loading('Calculando indicadores...');
  try {
    const report = await managementApi.summary(from, to);
    renderSummary(target, report);
  } catch (error) {
    renderError(target, error);
  }
}

function renderSummary(target, report) {
  const current = report.current;
  const previous = report.previous;
  const metadata = report.metadata;
  const leadTime = current.appointments ? `${current.averageLeadTimeDays.toFixed(1)} dias` : 'Sem base';
  const occupancy = current.capacityMinutes ? `${current.occupancyRate.toFixed(1)}%` : 'Sem capacidade';
  const closed = current.completed + current.noShows;
  const previousClosed = previous.completed + previous.noShows;
  const noShowText = `${current.noShows} / ${closed} consultas encerradas`;
  const previousRate = previousClosed ? previous.noShowRate : null;
  const noShowDelta = previousRate === null ? 'Sem base no período anterior' : `${delta(current.noShowRate - previousRate, ' p.p.')} vs. período anterior`;
  const leadTimeDelta = previous.appointments ? `${delta(current.averageLeadTimeDays - previous.averageLeadTimeDays, ' dias')} vs. período anterior` : 'Sem base no período anterior';
  const suggestionMarkup = report.suggestions.length
    ? report.suggestions.map(item => `<article class="suggestion-card"><div><p class="eyebrow">${escapeHtml(item.ruleVersion)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.explanation)}</p><p><strong>Evidência:</strong> ${escapeHtml(item.evidence)}</p><p><strong>Ação sugerida:</strong> ${escapeHtml(item.proposedAction)}</p></div><a class="secondary-button" href="../relatorios/relatorios.html?from=${encodeURIComponent(metadata.from)}&to=${encodeURIComponent(metadata.to)}&type=APPOINTMENTS">Ver análise</a></article>`).join('')
    : empty('Nenhuma regra operacional foi acionada neste período.');

  target.innerHTML = `<div class="metric-grid report-metrics">
      ${metric('Agendamentos', current.appointments, compare(current.appointments, previous.appointments))}
      ${metric('Taxa de ausência', `${current.noShowRate.toFixed(1)}%`, `${noShowText} · ${noShowDelta}`)}
      ${metric('Cancelamentos', current.cancelled, `${current.cancellationRate.toFixed(1)}% dos encerramentos · ${compare(current.cancelled, previous.cancelled)}`)}
      ${metric('Ocupação estimada', occupancy, `${current.occupiedMinutes} de ${current.capacityMinutes} minutos · disponibilidade ativa atual menos bloqueios`)}
      ${metric('Pacientes novos', current.newPatients, `${compare(current.newPatients, previous.newPatients)} · primeira consulta concluída`)}
      ${metric('Tempo até a consulta', leadTime, `Média entre agendamento e início · ${leadTimeDelta}`)}
      ${metric('Exames pendentes', current.pendingExams, 'Total atual na data de geração')}
      ${metric('Acompanhamentos abertos', current.openFollowUps, 'Total atual na data de geração')}
      ${metric('Recebíveis lançados', formatMoney(current.receivables), `Criados no período · ${formatMoney(current.receivables - previous.receivables)} vs. período anterior`)}
      ${metric('Recebido', formatMoney(current.received), `Pagamentos da coorte · ${formatMoney(current.received - previous.received)} vs. anterior`)}
      ${metric('Pendente', formatMoney(current.pending), `Saldo na geração · ${formatMoney(current.pending - previous.pending)} vs. anterior`)}
    </div>
    <section class="panel report-suggestions"><div class="panel-header"><div><p class="eyebrow">Sugestões explicáveis</p><h2>Sinais para revisão operacional</h2></div></div><div class="suggestion-list">${suggestionMarkup}</div><p class="muted-note">As sugestões mostram regra, versão, evidência e ação proposta. Elas não executam alterações nem fazem recomendações clínicas.</p></section>
    <section class="panel report-provenance"><div><p class="eyebrow">Rastreabilidade</p><h2>Origem desta execução</h2></div><dl><div><dt>Execução</dt><dd>${escapeHtml(metadata.reportRunId)}</dd></div><div><dt>Gerado em</dt><dd>${escapeHtml(formatDateTime(metadata.generatedAt))}</dd></div><div><dt>Gerado por</dt><dd>${escapeHtml(metadata.generatedBy)}</dd></div><div><dt>Período e fuso</dt><dd>${escapeHtml(metadata.from)} a ${escapeHtml(metadata.to)} · ${escapeHtml(metadata.timezone)}</dd></div><div><dt>Definições</dt><dd>${escapeHtml(metadata.definitionVersion)}</dd></div><div><dt>Correlation ID</dt><dd><code>${escapeHtml(metadata.correlationId || 'indisponível')}</code></dd></div><div><dt>Fontes</dt><dd>${escapeHtml(metadata.source)}</dd></div></dl><p class="muted-note">Ausência = faltas ÷ (consultas concluídas + faltas). Cancelamento = cancelamentos ÷ estados encerrados. Ocupação usa a disponibilidade recorrente ativa na data de geração menos bloqueios; como a agenda não tem histórico de vigência, valide essa estimativa para períodos passados. Paciente novo = primeira consulta concluída registrada no sistema.</p></section>`;
}

function metric(label, value, detail) {
  return `<article class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(detail)}</small></article>`;
}

function compare(current, previous) {
  if (!previous) return 'Sem base no período anterior';
  return `${delta(current - previous, '')} vs. período anterior`;
}

function delta(value, suffix) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${Number(value).toFixed(1)}${suffix}`;
}
