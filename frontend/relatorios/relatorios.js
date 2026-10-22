import { managementApi } from '../services/api.js';
import { mountScreen, renderError, monthRange, queryParam } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatMoney } from '../utils/html.js';
import { loading, empty } from '../components/ui.js';

const root = mountScreen({ key: 'relatorios', title: 'Relatórios', roles: ['GESTAO', 'ADMIN'] });
const sourcePageSize = 50;
let currentFilters = null;
let currentSources = null;
let selectedGroup = null;
if (root) void init();

async function init() {
  const [monthFrom, monthTo] = monthRange();
  const from = queryParam('from') || monthFrom;
  const to = queryParam('to') || monthTo;
  const type = queryParam('type') === 'FINANCE' ? 'FINANCE' : 'APPOINTMENTS';
  root.innerHTML = `<section class="panel report-toolbar"><div class="panel-header"><div><p class="eyebrow">Gestão</p><h2>Relatório analítico</h2></div><a class="secondary-button" href="../indicadores/indicadores.html">Voltar ao resumo sintético</a></div>
    <form id="report-form" class="report-filter-grid"><label>Tipo de relatório<select name="type"><option value="APPOINTMENTS" ${type === 'APPOINTMENTS' ? 'selected' : ''}>Consultas</option><option value="FINANCE" ${type === 'FINANCE' ? 'selected' : ''}>Financeiro</option></select></label>
      <label>De<input type="date" name="from" value="${escapeHtml(from)}" required></label><label>Até<input type="date" name="to" value="${escapeHtml(to)}" required></label>
      <label>Agrupar por<select name="groupBy"></select></label><button class="primary-button">Gerar análise</button></form></section>
    <div id="analysis-content">${loading('Preparando relatório...')}</div><div id="sources-content"></div>`;
  const form = root.querySelector('#report-form');
  form.querySelector('[name="type"]').addEventListener('change', () => updateGroupOptions(form));
  updateGroupOptions(form);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    await loadAnalysis(readFilters(form));
  });
  await loadAnalysis(readFilters(form));
}

function updateGroupOptions(form) {
  const select = form.querySelector('[name="groupBy"]');
  const financial = form.querySelector('[name="type"]').value === 'FINANCE';
  const options = financial
    ? [['MONTH', 'Mês'], ['WEEK', 'Semana'], ['DAY', 'Dia'], ['PAYER_TYPE', 'Tipo de pagador'], ['STATUS', 'Situação']]
    : [['MONTH', 'Mês'], ['WEEK', 'Semana'], ['DAY', 'Dia'], ['SPECIALTY', 'Especialidade'], ['DOCTOR', 'Médico'], ['STATUS', 'Situação']];
  const selected = select.value;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  if (options.some(([value]) => value === selected)) select.value = selected;
}

function readFilters(form) {
  const data = new FormData(form);
  return { from: String(data.get('from')), to: String(data.get('to')), type: String(data.get('type')), groupBy: String(data.get('groupBy')) };
}

async function loadAnalysis(filters) {
  currentFilters = filters;
  selectedGroup = null;
  currentSources = null;
  const target = root.querySelector('#analysis-content');
  root.querySelector('#sources-content').innerHTML = '';
  target.innerHTML = loading('Consultando dados...');
  try {
    const report = await managementApi.analysis(filters.from, filters.to, filters.type, filters.groupBy);
    renderAnalysis(target, report);
  } catch (error) {
    renderError(target, error);
  }
}

function renderAnalysis(target, report) {
  const statusGrouping = report.groupBy === 'STATUS';
  const columns = report.type === 'APPOINTMENTS'
    ? statusGrouping ? `<th>Consultas</th>` : `<th>Consultas</th><th>Concluídas</th><th>Faltas</th><th>Canceladas</th><th>Taxa de ausência</th>`
    : `<th>Recebíveis</th><th>Valor lançado</th><th>Recebido</th><th>Saldo pendente</th>`;
  const rows = report.rows.map(row => report.type === 'APPOINTMENTS'
    ? `<tr><td>${escapeHtml(row.label)}</td>${statusGrouping ? `<td>${row.records}</td>` : `<td>${row.records}</td><td>${row.completed}</td><td>${row.noShows}</td><td>${row.cancelled}</td><td>${row.noShowRate.toFixed(1)}%</td>`}<td><button class="secondary-button" data-source-group data-group-by="${escapeHtml(report.groupBy)}" data-group-value="${escapeHtml(row.key)}">Rastrear origem</button></td></tr>`
    : `<tr><td>${escapeHtml(row.label)}</td><td>${row.records}</td><td>${formatMoney(row.gross)}</td><td>${formatMoney(row.received)}</td><td>${formatMoney(row.pending)}</td><td><button class="secondary-button" data-source-group data-group-by="${escapeHtml(report.groupBy)}" data-group-value="${escapeHtml(row.key)}">Rastrear origem</button></td></tr>`).join('');
  const noData = report.rows.length ? '' : empty('Nenhum registro corresponde ao período e agrupamento.');
  target.innerHTML = `<section class="panel analysis-panel"><div class="panel-header"><div><p class="eyebrow">${report.type === 'APPOINTMENTS' ? 'Agenda' : 'Financeiro'}</p><h2>Resultados por ${escapeHtml(groupLabel(report.groupBy).toLowerCase())}</h2></div><span class="trace-badge">${report.rows.length} grupos</span></div>
    ${report.rows.length ? `<div class="table-wrap"><table class="report-table"><thead><tr><th>${escapeHtml(groupLabel(report.groupBy))}</th>${columns}<th>Rastreabilidade</th></tr></thead><tbody>${rows}</tbody></table></div>` : noData}
    <div class="report-meta"><span>Execução: <code>${escapeHtml(report.metadata.reportRunId)}</code></span><span>Gerado: ${escapeHtml(formatDateTime(report.metadata.generatedAt))}</span><span>Por: ${escapeHtml(report.metadata.generatedBy)}</span><span>Fuso: ${escapeHtml(report.metadata.timezone)}</span><span>Definição: ${escapeHtml(report.metadata.definitionVersion)}</span><span>Correlation ID: <code>${escapeHtml(report.metadata.correlationId || 'indisponível')}</code></span></div>
    <p class="privacy-note">Fontes: ${escapeHtml(report.metadata.source)}. Os dados de origem exibem identificador do registro e campos operacionais/financeiros; não incluem nome, documento ou texto clínico do paciente. A requisição fica registrada na auditoria.</p></section>`;
  target.querySelectorAll('[data-source-group]').forEach(button => button.addEventListener('click', () => {
    selectedGroup = { groupBy: button.dataset.groupBy, groupValue: button.dataset.groupValue, label: button.closest('tr').querySelector('td').textContent };
    void loadSources(0);
  }));
}

async function loadSources(page) {
  if (!currentFilters) return;
  const target = root.querySelector('#sources-content');
  target.innerHTML = `<section class="panel">${loading('Buscando registros de origem...')}</section>`;
  try {
    currentSources = await managementApi.sources(currentFilters.from, currentFilters.to, currentFilters.type, page,
      sourcePageSize, selectedGroup?.groupBy || '', selectedGroup?.groupValue || '');
    renderSources(target, currentSources);
  } catch (error) {
    renderError(target, error);
  }
}

function renderSources(target, report) {
  const financial = report.type === 'FINANCE';
  const rows = report.records.map(record => financial
    ? `<tr><td><code>${escapeHtml(record.sourceId)}</code></td><td>${escapeHtml(formatDateTime(record.occurredAt))}</td><td>${escapeHtml(record.classification)}</td><td>${escapeHtml(record.status)}</td><td>${formatMoney(record.amount)}</td><td>${formatMoney(record.received)}</td><td>${formatMoney(record.balance)}</td></tr>`
    : `<tr><td><code>${escapeHtml(record.sourceId)}</code></td><td>${escapeHtml(formatDateTime(record.occurredAt))}</td><td>${escapeHtml(record.classification)}</td><td>${escapeHtml(record.status)}</td></tr>`).join('');
  const end = Math.min((report.page + 1) * report.size, report.totalRecords);
  target.innerHTML = `<section class="panel"><div class="source-header"><div><p class="eyebrow">Registros de origem${selectedGroup ? ` · ${escapeHtml(selectedGroup.label)}` : ''}</p><h2>${report.totalRecords} registros encontrados</h2></div><button class="secondary-button" id="export-page" ${report.records.length ? '' : 'disabled'}>Exportar página CSV</button></div>
    ${report.records.length ? `<div class="table-wrap"><table><thead><tr><th>ID da origem</th><th>Data</th><th>${financial ? 'Pagador' : 'Médico'}</th><th>Situação</th>${financial ? '<th>Valor</th><th>Recebido</th><th>Saldo</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>` : empty('Nenhum registro de origem para exibir.')}
    <div class="source-pagination"><span>Exibindo ${report.totalRecords ? report.page * report.size + 1 : 0}–${end} de ${report.totalRecords}</span><button class="secondary-button" id="previous-page" ${report.page <= 0 ? 'disabled' : ''}>Anterior</button><button class="secondary-button" id="next-page" ${end >= report.totalRecords ? 'disabled' : ''}>Próxima</button></div>
    <div class="report-meta"><span>Execução: <code>${escapeHtml(report.metadata.reportRunId)}</code></span><span>Correlation ID: <code>${escapeHtml(report.metadata.correlationId || 'indisponível')}</code></span><span>Filtros: ${escapeHtml(JSON.stringify(report.metadata.filters))}</span></div>
    <p class="privacy-note">A origem é identificada por UUID para reconciliação. Os registros de consulta não exibem dados do paciente; o detalhamento clínico continua sujeito ao acesso próprio de cada domínio.</p></section>`;
  target.querySelector('#previous-page')?.addEventListener('click', () => void loadSources(report.page - 1));
  target.querySelector('#next-page')?.addEventListener('click', () => void loadSources(report.page + 1));
  target.querySelector('#export-page')?.addEventListener('click', exportCurrentPage);
}

async function exportCurrentPage() {
  if (!currentSources?.records?.length) return;
  const financial = currentSources.type === 'FINANCE';
  try {
    await managementApi.trackExport({
      reportRunId: currentSources.metadata.reportRunId,
      type: currentSources.type,
      from: currentFilters.from,
      to: currentFilters.to,
      groupBy: selectedGroup?.groupBy || '',
      groupValue: selectedGroup?.groupValue || '',
      page: currentSources.page,
      size: currentSources.size
    });
  } catch (error) {
    renderError(root.querySelector('#sources-content'), error);
    return;
  }
  const header = financial ? ['sourceId', 'occurredAt', 'payerType', 'status', 'amount', 'received', 'balance'] : ['sourceId', 'occurredAt', 'doctor', 'status'];
  const lines = [header, ...currentSources.records.map(row => financial
    ? [row.sourceId, row.occurredAt, row.classification, row.status, row.amount, row.received, row.balance]
    : [row.sourceId, row.occurredAt, row.classification, row.status])];
  const csv = `\uFEFF${lines.map(line => line.map(csvValue).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `relatorio-${currentSources.type.toLowerCase()}-pagina-${currentSources.page + 1}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function groupLabel(value) { return ({ DAY: 'Dia', WEEK: 'Semana', MONTH: 'Mês', DOCTOR: 'Médico', SPECIALTY: 'Especialidade', STATUS: 'Situação', PAYER_TYPE: 'Tipo de pagador' })[value] || value; }
