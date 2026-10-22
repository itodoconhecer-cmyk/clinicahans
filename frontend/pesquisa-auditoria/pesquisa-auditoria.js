import { adminApi } from '../services/api.js';
import { mountScreen, renderError, queryParam } from '../shared/screen.js';
import { escapeHtml, formatDateTime } from '../utils/html.js';
import { empty } from '../components/ui.js';

const root = mountScreen({ key: 'pesquisa-auditoria', title: 'Pesquisa de auditoria', roles: ['ADMIN'] });
if (root) void init();

async function init() {
  const correlationId = queryParam('correlationId') || '';
  root.innerHTML = `<form id="form" class="panel form-grid"><label>Tipo da entidade<input name="entityType"></label><label>ID da entidade<input name="entityId"></label><label>Correlation ID<input name="correlationId" autocomplete="off" value="${escapeHtml(correlationId)}"></label><button class="primary-button">Pesquisar</button></form><div id="results"></div>`;
  root.querySelector('#form').addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const results = root.querySelector('#results');
    results.innerHTML = '';
    try {
      const rows = await adminApi.audit(data.get('entityType'), data.get('entityId'), 100, data.get('correlationId'));
      results.innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Rota</th><th>Correlation ID</th><th>Contexto da requisição</th></tr></thead><tbody>${rows.map(row => `<tr><td>${escapeHtml(formatDateTime(row.occurredAt))}</td><td>${escapeHtml(row.username || 'sistema')}</td><td>${escapeHtml(row.action)}</td><td>${escapeHtml(row.requestMethod || '')} ${escapeHtml(row.requestPath || row.entityType || '')}</td><td><code>${escapeHtml(row.correlationId || '—')}</code></td><td><pre>${escapeHtml(row.requestContext || '—')}</pre></td></tr>`).join('')}</tbody></table></div>` : empty('Nenhum evento encontrado.');
    } catch (error) {
      renderError(results, error);
    }
  });
  if (correlationId) root.querySelector('#form').requestSubmit();
}
