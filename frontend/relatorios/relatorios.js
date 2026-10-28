import { managementApi, operationalReportApi } from '../services/api.js';
import { mountScreen, renderError, monthRange, queryParam } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatMoney } from '../utils/html.js';
import { loading, empty } from '../components/ui.js';
import { reportFilterFields, setupReportFilters, readReportFilters } from '../shared/report-filters.js';

const root = mountScreen({ key: 'relatorios', title: 'Relatórios', roles: ['GESTAO', 'ADMIN'] });
const sourcePageSize = 50;
let currentFilters = null;
let currentSources = null;
let currentAnalysis = null;
let selectedGroup = null;
let summaryContext = null;
if (root) void init();

async function init() {
  const [monthFrom, monthTo] = monthRange();
  const from = queryParam('from') || monthFrom;
  const to = queryParam('to') || monthTo;
  const requestedType = queryParam('type');
  const type = ['FINANCE', 'PENDING_EXAMS', 'OPEN_FOLLOWUPS', 'OCCUPIED', 'CAPACITY'].includes(requestedType) ? requestedType : 'APPOINTMENTS';
  const cohort = queryParam('cohort') || '';
  const initial = { from, to, doctorId: queryParam('doctorId') || '', specialtyId: queryParam('specialtyId') || '' };
  summaryContext = { ...initial, parentRunId: queryParam('parentRunId') || '' };
  root.innerHTML = `<section class="panel report-toolbar"><div class="panel-header"><div><p class="eyebrow">Gestão</p><h2>Relatório analítico</h2></div><a class="secondary-button" id="summary-link" href="../indicadores/indicadores.html">Voltar ao resumo sintético</a></div>
    <form id="report-form" class="report-filter-grid"><label>Tipo de relatório<select name="type">${[['APPOINTMENTS','Agendamentos'],['FINANCE','Financeiro'],['PENDING_EXAMS','Exames pendentes'],['OPEN_FOLLOWUPS','Acompanhamentos abertos'],['OCCUPIED','Minutos ocupados'],['CAPACITY','Capacidade disponível']].map(([value,label]) => `<option value="${value}" ${type === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      ${reportFilterFields(initial)}
      <label id="cohort-filter">População<select name="cohort"></select></label><label>Agrupar por<select name="groupBy"></select></label><button class="primary-button">Gerar análise</button></form></section>
    <div id="analysis-content">${loading('Preparando relatório...')}</div><div id="sources-content"></div>`;
  const form = root.querySelector('#report-form');
  form.querySelector('[name="type"]').addEventListener('change', () => { updateGroupOptions(form); updateCohortOptions(form); });
  updateGroupOptions(form);
  const requestedGroup = queryParam('groupBy');
  if (Array.from(form.elements.groupBy.options).some(option => option.value === requestedGroup)) {
    form.elements.groupBy.value = requestedGroup;
  }
  updateCohortOptions(form, cohort);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try { await loadAnalysis(readFilters(form)); }
    catch (error) { form.querySelector('[data-filter-message]').textContent = error.message; }
  });
  await setupReportFilters(form);
  await loadAnalysis(readFilters(form));
}

function updateCohortOptions(form, requested = '') {
  const select = form.elements.cohort;
  const operational = isOperational(form.elements.type.value);
  form.querySelector('#cohort-filter').hidden = operational;
  select.disabled = operational;
  if (operational) { select.innerHTML = ''; return; }
  const options = form.elements.type.value === 'FINANCE'
    ? [['RECEIVABLES', 'Todos os recebíveis'], ['RECEIVED', 'Recebíveis com pagamento'], ['PENDING', 'Recebíveis com saldo pendente']]
    : [['APPOINTMENTS', 'Todos os agendamentos'], ['NO_SHOWS', 'Faltas'], ['CANCELLED', 'Cancelamentos'], ['COMPLETED', 'Concluídos'], ['CLOSED', 'Concluídos e faltas'], ['ENDED', 'Concluídos, faltas e cancelamentos'], ['FIRST_VISIT', 'Primeiras consultas concluídas'], ['LEAD_TIME', 'Agendamentos considerados na espera média']];
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  if (options.some(([value]) => value === requested)) select.value = requested;
}

function updateGroupOptions(form) {
  const select = form.querySelector('[name="groupBy"]');
  const financial = form.querySelector('[name="type"]').value === 'FINANCE';
  const options = isOperational(form.elements.type.value)
    ? [['MONTH', 'Mês'], ['YEAR', 'Ano'], ['DAY', 'Dia'], ['SPECIALTY', 'Especialidade'], ['DOCTOR', 'Médico']]
    : financial
    ? [['MONTH', 'Mês'], ['YEAR', 'Ano'], ['WEEK', 'Semana'], ['DAY', 'Dia'], ['SPECIALTY', 'Especialidade'], ['DOCTOR', 'Médico'], ['PAYER_TYPE', 'Tipo de pagador'], ['STATUS', 'Situação']]
    : [['MONTH', 'Mês'], ['YEAR', 'Ano'], ['WEEK', 'Semana'], ['DAY', 'Dia'], ['SPECIALTY', 'Especialidade'], ['DOCTOR', 'Médico'], ['STATUS', 'Situação']];
  const selected = select.value;
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
  if (options.some(([value]) => value === selected)) select.value = selected;
}

function readFilters(form) {
  const data = new FormData(form);
  const filters = readReportFilters(form);
  const sameContext = ['from', 'to', 'doctorId', 'specialtyId'].every(key => filters[key] === summaryContext[key]);
  return { ...filters, type: String(data.get('type')), groupBy: String(data.get('groupBy')), cohort: String(data.get('cohort')), parentRunId: sameContext ? summaryContext.parentRunId : '' };
}

async function loadAnalysis(filters) {
  currentFilters = filters;
  currentAnalysis = null;
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.doctorId) params.set('doctorId', filters.doctorId);
  if (filters.specialtyId) params.set('specialtyId', filters.specialtyId);
  root.querySelector('#summary-link').href = `../indicadores/indicadores.html?${params.toString()}`;
  selectedGroup = null;
  currentSources = null;
  const target = root.querySelector('#analysis-content');
  root.querySelector('#sources-content').innerHTML = '';
  target.innerHTML = loading('Consultando dados...');
  try {
    const report = isOperational(filters.type)
      ? await operationalReportApi.analysis(filters)
      : await managementApi.analysis(filters.from, filters.to, filters.type, filters.groupBy, filters);
    currentAnalysis = report;
    if (isOperational(filters.type)) renderOperationalAnalysis(target, report);
    else renderAnalysis(target, report);
  } catch (error) {
    renderError(target, error);
  }
}

function renderAnalysis(target, report) {
  const statusGrouping = report.groupBy === 'STATUS';
  const columns = report.type === 'APPOINTMENTS'
    ? `${statusGrouping ? '<th>Consultas</th>' : '<th>Consultas</th><th>Concluídas</th><th>Faltas</th><th>Canceladas</th><th>Taxa de ausência</th>'}${currentFilters.cohort === 'LEAD_TIME' ? '<th>Espera média</th>' : ''}`
    : `<th>Recebíveis</th><th>Valor lançado</th><th>Recebido</th><th>Saldo pendente</th>`;
  const rows = report.rows.map(row => report.type === 'APPOINTMENTS'
    ? `<tr><td>${escapeHtml(row.label)}</td>${statusGrouping ? `<td>${row.records}</td>` : `<td>${row.records}</td><td>${row.completed}</td><td>${row.noShows}</td><td>${row.cancelled}</td><td>${row.noShowRate.toFixed(1)}%</td>`}${currentFilters.cohort === 'LEAD_TIME' ? `<td>${Number(row.averageLeadTimeDays).toFixed(1)} dias</td>` : ''}<td><button class="secondary-button" data-source-group data-group-by="${escapeHtml(report.groupBy)}" data-group-value="${escapeHtml(row.key)}">Rastrear origem</button></td></tr>`
    : `<tr><td>${escapeHtml(row.label)}</td><td>${row.records}</td><td>${formatMoney(row.gross)}</td><td>${formatMoney(row.received)}</td><td>${formatMoney(row.pending)}</td><td><button class="secondary-button" data-source-group data-group-by="${escapeHtml(report.groupBy)}" data-group-value="${escapeHtml(row.key)}">Rastrear origem</button></td></tr>`).join('');
  const noData = report.rows.length ? '' : empty('Nenhum registro corresponde ao período e agrupamento.');
  target.innerHTML = `<section class="panel analysis-panel"><div class="panel-header"><div><p class="eyebrow">${report.type === 'APPOINTMENTS' ? 'Agenda' : 'Financeiro'}</p><h2>Resultados por ${escapeHtml(groupLabel(report.groupBy).toLowerCase())}</h2></div><span class="trace-badge">${report.rows.length} grupos</span></div>
    ${report.rows.length ? `<div class="table-wrap"><table class="report-table"><thead><tr><th>${escapeHtml(groupLabel(report.groupBy))}</th>${columns}<th>Rastreabilidade</th></tr></thead><tbody>${rows}</tbody></table></div>` : noData}
    <div class="report-meta"><span>Execução: <code>${escapeHtml(report.metadata.reportRunId)}</code></span><span>Gerado: ${escapeHtml(formatDateTime(report.metadata.generatedAt))}</span><span>Por: ${escapeHtml(report.metadata.generatedBy)}</span><span>Fuso: ${escapeHtml(report.metadata.timezone)}</span><span>Definição: ${escapeHtml(report.metadata.definitionVersion)}</span><span>Correlation ID: <code>${escapeHtml(report.metadata.correlationId || 'indisponível')}</code></span></div>
    <p class="privacy-note">Fontes: ${escapeHtml(report.metadata.source)}. Filtros: ${escapeHtml(JSON.stringify(report.metadata.filters))}. A especialidade corresponde à especialidade principal atual do médico. Recebido e pendente são coortes de recebíveis, cujos valores compõem os totais respectivos. A requisição fica registrada na auditoria.</p></section>`;
  target.querySelectorAll('[data-source-group]').forEach(button => button.addEventListener('click', () => {
    selectedGroup = { groupBy: button.dataset.groupBy, groupValue: button.dataset.groupValue, label: button.closest('tr').querySelector('td').textContent };
    void loadSources(0);
  }));
}

function isOperational(type) { return ['PENDING_EXAMS', 'OPEN_FOLLOWUPS', 'OCCUPIED', 'CAPACITY'].includes(type); }
function operationalLabel(type) { return ({ PENDING_EXAMS: 'Exames pendentes', OPEN_FOLLOWUPS: 'Acompanhamentos abertos', OCCUPIED: 'Minutos ocupados', CAPACITY: 'Capacidade disponível' })[type] || type; }
function operationalValue(type, value) { return ['OCCUPIED', 'CAPACITY'].includes(type) ? `${Number(value).toFixed(1)} min` : String(value); }

function renderOperationalAnalysis(target, report) {
  const rows = report.rows.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${row.records}</td><td>${escapeHtml(operationalValue(report.type, row.value))}</td><td><button class="secondary-button" data-source-group data-group-value="${escapeHtml(row.key)}">Rastrear origem</button></td></tr>`).join('');
  target.innerHTML = `<section class="panel analysis-panel"><div class="panel-header"><div><p class="eyebrow">${escapeHtml(operationalLabel(report.type))}</p><h2>Resultados por ${escapeHtml(groupLabel(report.groupBy).toLowerCase())}</h2></div></div>
    ${rows ? `<div class="table-wrap"><table><thead><tr><th>Grupo</th><th>Registros</th><th>Valor</th><th>Rastreabilidade</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Nenhum registro corresponde aos filtros.')}
    <div class="report-meta"><span>Execução: <code>${escapeHtml(report.metadata.reportRunId)}</code></span><span>Gerado: ${escapeHtml(formatDateTime(report.metadata.generatedAt))}</span><span>Por: ${escapeHtml(report.metadata.generatedBy)}</span><span>Definição: ${escapeHtml(report.metadata.definitionVersion || 'indisponível')}</span><span>Correlation ID: <code>${escapeHtml(report.metadata.correlationId || 'indisponível')}</code></span></div>
    <p class="privacy-note">${escapeHtml(report.metadata.definition)}. A especialidade corresponde à principal atual do médico. O status dos exames e acompanhamentos é o atual, não uma reconstrução histórica.</p></section>`;
  target.querySelectorAll('[data-source-group]').forEach(button => button.addEventListener('click', () => {
    selectedGroup = { groupBy: report.groupBy, groupValue: button.dataset.groupValue, label: button.closest('tr').querySelector('td').textContent };
    void loadSources(0);
  }));
}

function renderOperationalSources(target, report) {
  const rows = report.records.map(record => `<tr><td><code>${escapeHtml(record.sourceId)}</code></td><td>${escapeHtml(formatDateTime(record.occurredAt))}</td><td>${escapeHtml(record.doctorName || 'Não informado')}</td><td>${escapeHtml(record.status)}</td><td>${escapeHtml(operationalValue(report.type, record.value))}</td><td><button class="secondary-button" data-record-id="${escapeHtml(record.sourceId)}" data-source-date="${escapeHtml(record.sourceDate)}">Ver registro</button></td></tr>`).join('');
  const end = Math.min((report.page + 1) * report.size, report.totalRecords);
  target.innerHTML = `<section class="panel"><div class="source-header"><div><p class="eyebrow">Registros de origem · ${escapeHtml(selectedGroup.label)}</p><h2>${report.totalRecords} registros encontrados</h2></div></div>
    ${rows ? `<div class="table-wrap"><table><thead><tr><th>ID da origem</th><th>Data</th><th>Médico</th><th>Situação</th><th>Valor</th><th>Registro</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Nenhum registro de origem para exibir.')}
    <div class="source-pagination"><span>Exibindo ${report.totalRecords ? report.page * report.size + 1 : 0}–${end} de ${report.totalRecords}</span><button class="secondary-button" id="previous-page" ${report.page <= 0 ? 'disabled' : ''}>Anterior</button><button class="secondary-button" id="next-page" ${end >= report.totalRecords ? 'disabled' : ''}>Próxima</button></div>
    <div class="report-meta"><span>Execução: <code>${escapeHtml(report.metadata.reportRunId)}</code></span></div></section><div id="record-content"></div>`;
  target.querySelector('#previous-page')?.addEventListener('click', () => void loadSources(report.page - 1));
  target.querySelector('#next-page')?.addEventListener('click', () => void loadSources(report.page + 1));
  target.querySelectorAll('[data-record-id]').forEach(button => button.addEventListener('click', () => void loadOperationalRecord(button.dataset.recordId, button.dataset.sourceDate)));
}

async function loadOperationalRecord(id, sourceDate) {
  const target = root.querySelector('#record-content');
  target.innerHTML = `<section class="panel">${loading('Buscando registro...')}</section>`;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const detail = await operationalReportApi.record(currentFilters, selectedGroup.groupValue, id, sourceDate, currentSources?.metadata?.reportRunId || '');
    const record = detail.record;
    target.innerHTML = `<section class="panel record-panel"><div class="panel-header"><div><p class="eyebrow">Registro de origem</p><h2>${escapeHtml(operationalLabel(currentFilters.type))}</h2></div><button class="secondary-button" id="close-record">Voltar à listagem</button></div><dl class="record-details">
      <div><dt>Identificador</dt><dd><code>${escapeHtml(record.sourceId)}</code></dd></div><div><dt>Data</dt><dd>${escapeHtml(formatDateTime(record.occurredAt))}</dd></div><div><dt>Médico</dt><dd>${escapeHtml(record.doctorName || 'Não informado')}</dd></div><div><dt>Situação</dt><dd>${escapeHtml(record.status)}</dd></div><div><dt>Valor</dt><dd>${escapeHtml(operationalValue(currentFilters.type, record.value))}</dd></div>${record.relatedIds ? `<div><dt>Bloqueios considerados</dt><dd><code>${escapeHtml(record.relatedIds)}</code></dd></div>` : ''}</dl>
      <p class="privacy-note">Consulta registrada em auditoria · Execução: ${escapeHtml(detail.metadata.reportRunId)}</p></section>`;
    target.querySelector('#close-record').addEventListener('click', () => { target.innerHTML = ''; root.querySelector('.source-header')?.scrollIntoView({ behavior: 'smooth' }); });
  } catch (error) { renderError(target, error); }
}

async function loadSources(page) {
  if (!currentFilters) return;
  const target = root.querySelector('#sources-content');
  target.innerHTML = `<section class="panel">${loading('Buscando registros de origem...')}</section>`;
  try {
    if (isOperational(currentFilters.type)) {
      currentSources = await operationalReportApi.sources(currentFilters, selectedGroup.groupValue, page, sourcePageSize, currentAnalysis?.metadata?.reportRunId || '');
      renderOperationalSources(target, currentSources);
    } else {
      currentSources = await managementApi.sources(currentFilters.from, currentFilters.to, currentFilters.type, page,
        sourcePageSize, selectedGroup?.groupBy || '', selectedGroup?.groupValue || '', { ...currentFilters, parentRunId: currentAnalysis?.metadata?.reportRunId || '' });
      renderSources(target, currentSources);
    }
  } catch (error) {
    renderError(target, error);
  }
}

function renderSources(target, report) {
  const financial = report.type === 'FINANCE';
  const rows = report.records.map(record => financial
    ? `<tr><td><code>${escapeHtml(record.sourceId)}</code></td><td>${escapeHtml(formatDateTime(record.occurredAt))}</td><td>${escapeHtml(record.classification)}</td><td>${escapeHtml(record.status)}</td><td>${formatMoney(record.amount)}</td><td>${formatMoney(record.received)}</td><td>${formatMoney(record.balance)}</td><td><button class="secondary-button" data-record-id="${escapeHtml(record.sourceId)}">Ver registro</button></td></tr>`
    : `<tr><td><code>${escapeHtml(record.sourceId)}</code></td><td>${escapeHtml(formatDateTime(record.occurredAt))}</td><td>${escapeHtml(record.classification)}</td><td>${escapeHtml(record.status)}</td>${currentFilters.cohort === 'LEAD_TIME' ? `<td>${Number(record.leadTimeDays).toFixed(1)} dias</td>` : ''}<td><button class="secondary-button" data-record-id="${escapeHtml(record.sourceId)}">Ver registro</button></td></tr>`).join('');
  const end = Math.min((report.page + 1) * report.size, report.totalRecords);
  target.innerHTML = `<section class="panel"><div class="source-header"><div><p class="eyebrow">Registros de origem${selectedGroup ? ` · ${escapeHtml(selectedGroup.label)}` : ''}</p><h2>${report.totalRecords} registros encontrados</h2></div><button class="secondary-button" id="export-page" ${report.records.length ? '' : 'disabled'}>Exportar página CSV</button></div>
    ${report.records.length ? `<div class="table-wrap"><table><thead><tr><th>ID da origem</th><th>Data</th><th>${financial ? 'Pagador' : 'Médico'}</th><th>Situação</th>${financial ? '<th>Valor</th><th>Recebido</th><th>Saldo</th>' : currentFilters.cohort === 'LEAD_TIME' ? '<th>Espera</th>' : ''}<th>Registro</th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Nenhum registro de origem para exibir.')}
    <div class="source-pagination"><span>Exibindo ${report.totalRecords ? report.page * report.size + 1 : 0}–${end} de ${report.totalRecords}</span><button class="secondary-button" id="previous-page" ${report.page <= 0 ? 'disabled' : ''}>Anterior</button><button class="secondary-button" id="next-page" ${end >= report.totalRecords ? 'disabled' : ''}>Próxima</button></div>
    <div class="report-meta"><span>Execução: <code>${escapeHtml(report.metadata.reportRunId)}</code></span><span>Correlation ID: <code>${escapeHtml(report.metadata.correlationId || 'indisponível')}</code></span><span>Filtros: ${escapeHtml(JSON.stringify(report.metadata.filters))}</span></div>
    <p class="privacy-note">A origem é identificada por UUID para reconciliação. Os registros de consulta não exibem dados do paciente; o detalhamento clínico continua sujeito ao acesso próprio de cada domínio.</p></section><div id="record-content"></div>`;
  target.querySelector('#previous-page')?.addEventListener('click', () => void loadSources(report.page - 1));
  target.querySelector('#next-page')?.addEventListener('click', () => void loadSources(report.page + 1));
  target.querySelector('#export-page')?.addEventListener('click', exportCurrentPage);
  target.querySelectorAll('[data-record-id]').forEach(button => button.addEventListener('click', () => void loadRecord(report.type, button.dataset.recordId)));
}

async function loadRecord(type, id) {
  const target = root.querySelector('#record-content');
  target.innerHTML = `<section class="panel">${loading('Buscando registro...')}</section>`;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const record = await managementApi.record(type, id, currentSources?.metadata?.reportRunId || '');
    const financial = type === 'FINANCE';
    target.innerHTML = `<section class="panel record-panel"><div class="panel-header"><div><p class="eyebrow">Registro de origem</p><h2>${financial ? 'Recebível' : 'Agendamento'}</h2></div><button class="secondary-button" id="close-record">Voltar à listagem</button></div>
      <dl class="record-details"><div><dt>Identificador</dt><dd><code>${escapeHtml(record.sourceId)}</code></dd></div><div><dt>Data</dt><dd>${escapeHtml(formatDateTime(record.occurredAt))}</dd></div><div><dt>Médico</dt><dd>${escapeHtml(record.doctorName || 'Não informado')}</dd></div><div><dt>Situação</dt><dd>${escapeHtml(record.status)}</dd></div>
      ${record.specialty ? `<div><dt>Especialidade principal atual</dt><dd>${escapeHtml(record.specialty)}</dd></div>` : ''}${record.modality ? `<div><dt>${financial ? 'Pagador' : 'Modalidade'}</dt><dd>${escapeHtml(record.modality)}</dd></div>` : ''}${record.endsAt ? `<div><dt>Término</dt><dd>${escapeHtml(formatDateTime(record.endsAt))}</dd></div>` : ''}${record.createdAt ? `<div><dt>Agendado em</dt><dd>${escapeHtml(formatDateTime(record.createdAt))}</dd></div>` : ''}
      ${financial ? `<div><dt>Valor</dt><dd>${formatMoney(record.amount)}</dd></div><div><dt>Recebido</dt><dd>${formatMoney(record.received)}</dd></div><div><dt>Saldo</dt><dd>${formatMoney(record.balance)}</dd></div>` : ''}</dl>
      ${financial && record.payments?.length ? `<h3>Pagamentos que compõem o recebido</h3><div class="table-wrap"><table><thead><tr><th>Identificador</th><th>Data</th><th>Forma</th><th>Valor</th></tr></thead><tbody>${record.payments.map(payment => `<tr><td><code>${escapeHtml(payment.sourceId)}</code></td><td>${escapeHtml(formatDateTime(payment.paidAt))}</td><td>${escapeHtml(payment.method)}</td><td>${formatMoney(payment.amount)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <p class="privacy-note">Consulta do registro registrada em auditoria${record.metadata?.reportRunId ? ` · Execução: ${escapeHtml(record.metadata.reportRunId)}` : ''}.</p></section>`;
    target.querySelector('#close-record').addEventListener('click', () => { target.innerHTML = ''; root.querySelector('.source-header')?.scrollIntoView({ behavior: 'smooth' }); });
  } catch (error) { renderError(target, error); }
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
      size: currentSources.size,
      doctorId: currentFilters.doctorId || null,
      specialtyId: currentFilters.specialtyId || null,
      cohort: currentFilters.cohort
    });
  } catch (error) {
    renderError(root.querySelector('#sources-content'), error);
    return;
  }
  const leadTime = currentFilters.cohort === 'LEAD_TIME';
  const header = financial ? ['sourceId', 'occurredAt', 'payerType', 'status', 'amount', 'received', 'balance'] : ['sourceId', 'occurredAt', 'doctor', 'status', ...(leadTime ? ['leadTimeDays'] : [])];
  const lines = [header, ...currentSources.records.map(row => financial
    ? [row.sourceId, row.occurredAt, row.classification, row.status, row.amount, row.received, row.balance]
    : [row.sourceId, row.occurredAt, row.classification, row.status, ...(leadTime ? [row.leadTimeDays] : [])])];
  const csv = `\uFEFF${lines.map(line => line.map(csvValue).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `relatorio-${currentSources.type.toLowerCase()}-pagina-${currentSources.page + 1}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvValue(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function groupLabel(value) { return ({ DAY: 'Dia', WEEK: 'Semana', MONTH: 'Mês', YEAR: 'Ano', DOCTOR: 'Médico', SPECIALTY: 'Especialidade', STATUS: 'Situação', PAYER_TYPE: 'Tipo de pagador' })[value] || value; }
