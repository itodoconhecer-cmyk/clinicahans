import { appointmentApi, managementApi } from '../services/api.js';
import { mountScreen, renderError, toneForStatus, localDayRange, monthRange } from '../shared/screen.js';
import { escapeHtml, formatDateTime, formatMoney } from '../utils/html.js';
import { loading, empty, badge } from '../components/ui.js';
import { renderScheduleViews, verticalScheduleMarkup } from '../components/schedule-views.js';
import { session } from '../state/session.js';

const root = mountScreen({ key: 'visao-geral', title: 'Visão geral', roles: ['RECEPCAO', 'MEDICO', 'GESTAO', 'ADMIN'] });
if (root) void init();

async function init() {
  try {
    if (session.hasAnyRole('GESTAO', 'ADMIN')) {
      root.innerHTML = loading('Carregando indicadores...');
      const [from, to] = monthRange();
      const dashboard = await managementApi.dashboard(from, to);
      root.innerHTML = `<div class="metric-grid">
        <article class="metric-card"><span>Agendamentos</span><strong>${dashboard.appointments}</strong></article>
        <article class="metric-card"><span>No-show</span><strong>${Number(dashboard.noShowRate).toFixed(1)}%</strong></article>
        <article class="metric-card"><span>Follow-ups</span><strong>${dashboard.openFollowUps}</strong></article>
        <article class="metric-card"><span>Recebíveis</span><strong>${formatMoney(dashboard.grossReceivables)}</strong></article>
      </div>`;
    }

    if (session.hasAnyRole('RECEPCAO', 'MEDICO', 'ADMIN')) await renderTodayAgenda();
  } catch (error) {
    renderError(root, error);
  }
}

async function renderTodayAgenda() {
  const [from, to] = localDayRange();
  const rows = await appointmentApi.list(from, to);
  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.innerHTML = `<div class="panel-header"><div><h2>Agenda de hoje</h2><p class="muted-copy">${rows.length} ${rows.length === 1 ? 'agendamento' : 'agendamentos'}</p></div>
    <a class="secondary-button" href="../agenda/agenda.html">Abrir agenda completa</a></div><section data-today-views aria-label="Visualização da agenda de hoje"></section>`;
  root.append(panel);

  const appointments = rows.map(appointment => ({
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
    detail: 'Consulta na agenda'
  }));
  renderScheduleViews(panel.querySelector('[data-today-views]'), {
    horizontal: () => rows.length ? `<div class="table-wrap"><table><thead><tr><th>Horário</th><th>Status</th></tr></thead><tbody>${rows.map(appointment => `
      <tr><td>${escapeHtml(formatDateTime(appointment.startsAt))}</td><td>${badge(appointment.status, toneForStatus(appointment.status))}</td></tr>`).join('')}</tbody></table></div>` : empty('Nenhuma consulta hoje.'),
    vertical: () => verticalScheduleMarkup(appointments, 'Nenhuma consulta hoje.')
  });
}
