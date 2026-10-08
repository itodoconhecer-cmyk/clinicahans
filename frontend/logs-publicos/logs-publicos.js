import { publicOperationsApi } from '../services/api.js';
import { escapeHtml, formatDateTime } from '../utils/html.js';

const state = document.getElementById('logs-state');
const table = document.getElementById('logs-table');
const refreshButton = document.getElementById('refresh-logs');

refreshButton.addEventListener('click', () => void load());
void load();

async function load() {
  refreshButton.disabled = true;
  state.hidden = false;
  state.classList.remove('error');
  state.textContent = 'Carregando registros...';
  table.hidden = true;
  try {
    const rows = await publicOperationsApi.recent();
    if (!rows.length) {
      state.textContent = 'Ainda não há registros de operações para exibir.';
      return;
    }
    state.hidden = true;
    table.innerHTML = `<table>
      <thead><tr><th>Quando</th><th>Método</th><th>Rota</th><th>Resultado</th><th>Duração</th></tr></thead>
      <tbody>${rows.map(row => `<tr>
        <td>${escapeHtml(formatDateTime(row.occurredAt))}</td>
        <td>${escapeHtml(row.method)}</td>
        <td class="route-cell">${escapeHtml(row.route)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.durationMs)} ms</td>
      </tr>`).join('')}</tbody>
    </table>`;
    table.hidden = false;
  } catch (error) {
    const message = error?.message || 'Não foi possível carregar os registros. Tente novamente.';
    const correlation = error?.correlationId
      ? `<p>Referência: ${escapeHtml(error.correlationId)}</p>`
      : '';
    state.innerHTML = `${escapeHtml(message)}${correlation}`;
    state.classList.add('error');
  } finally {
    refreshButton.disabled = false;
  }
}
